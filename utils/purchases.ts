import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';

const itemSKUs = Platform.select({
  ios: ['com.resume.starter', 'com.resume.pro'],
  android: []
}) as string[];

const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

// Safely resolve the native module at runtime to prevent Expo Go from crashing on startup
const getIAP = () => {
  if (isExpoGo) {
    // Avoid importing/requiring react-native-iap completely in Expo Go as it throws fatal NitroModules errors
    return null;
  }
  try {
    return require('react-native-iap');
  } catch (err) {
    return null;
  }
};

/**
 * Initialize connection to Apple StoreKit / Google Play Billing
 */
export const initPurchases = async (userId?: string) => {
  const RNIap = getIAP();
  if (!RNIap) return;
  try {
    if (Platform.OS === 'ios') {
      try {
        await RNIap.setup({ storekitMode: 'STOREKIT1_MODE' });
        console.log('Forced StoreKit 1 Mode on iOS');
      } catch (setupErr) {
        console.warn('Failed to setup StoreKit 1 mode:', setupErr);
      }
    }
    await RNIap.initConnection();
  } catch (err) {
    console.warn('Failed to connect to StoreKit:', err);
  }
};

const MOCK_PACKAGES = [
  {
    product: {
      identifier: 'com.resume.starter',
      title: 'Starter',
      description: '200 Credits / Week',
      priceString: '$4.99/Wk',
    }
  },
  {
    product: {
      identifier: 'com.resume.pro',
      title: 'Pro',
      description: '400 Credits / Week',
      priceString: '$9.99/Wk',
    }
  }
];

/**
 * Fetch the active store products
 */
export const getPackages = async (): Promise<any[]> => {
  const RNIap = getIAP();
  if (!RNIap) {
    return MOCK_PACKAGES;
  }
  try {
    const products = await RNIap.fetchProducts({ skus: itemSKUs }) || [];

    if (products.length === 0) {
      console.warn("fetchProducts returned empty array. Using mock fallback packages.");
      return MOCK_PACKAGES;
    }

    return products.map((product: any) => {
      const productId = product.productId || product.identifier || product.id || '';
      let desc = product.description;
      let title = product.title;

      if (productId === 'com.resume.starter') {
        desc = '200 Credits / Week';
        title = 'Starter';
      } else if (productId === 'com.resume.pro') {
        desc = '400 Credits / Week';
        title = 'Pro';
      }

      // Format price to 2 decimal places and preserve currency symbol if possible
      let priceStr = '';
      const rawPrice = product.price;
      const localized = product.localizedPrice;
      if (typeof rawPrice === 'number') {
        priceStr = rawPrice.toFixed(2);
        if (typeof localized === 'string') {
          const symbol = localized.replace(/[0-9.,\s]/g, '');
          priceStr = symbol ? `${symbol}${priceStr}` : priceStr;
        }
      } else {
        const numPrice = parseFloat(rawPrice);
        if (!isNaN(numPrice)) {
          priceStr = numPrice.toFixed(2);
          if (typeof localized === 'string') {
            const symbol = localized.replace(/[0-9.,\s]/g, '');
            priceStr = symbol ? `${symbol}${priceStr}` : priceStr;
          }
        } else {
          priceStr = localized || String(rawPrice || '');
        }
      }

      return {
        product: {
          identifier: productId,
          title: title || product.title || (productId === 'com.resume.pro' ? 'Pro' : 'Starter'),
          description: desc,
          priceString: priceStr,
        }
      };
    });
  } catch (e) {
    console.error("Error fetching store products, returning mock packages:", e);
    return MOCK_PACKAGES;
  }
};

/**
 * Trigger the native purchase sheet
 */
export const purchasePackage = async (pack: any) => {
  const RNIap = getIAP();
  if (!RNIap) {
    throw new Error('Store connection is not available in this environment');
  }
  try {
    const purchase = await RNIap.requestPurchase({
      type: 'in-app',
      request: {
        apple: { sku: pack.product.identifier }
      }
    });
    return purchase;
  } catch (e: any) {
    console.error("Purchase execution error:", e);
    throw e;
  }
};

/**
 * Restore past purchases from StoreKit / Google Play Billing
 */
export const restorePurchases = async (): Promise<any[]> => {
  const RNIap = getIAP();
  if (!RNIap) {
    return [];
  }
  try {
    const purchases = await RNIap.getAvailablePurchases();
    return purchases || [];
  } catch (e) {
    console.error("Restore purchases error:", e);
    return [];
  }
};

/**
 * Retrieve the current App Store receipt for iOS
 */
export const getReceipt = async (): Promise<string | null> => {
  const RNIap = getIAP();
  if (!RNIap || Platform.OS !== 'ios') {
    return null;
  }
  try {
    return await RNIap.getReceiptIOS();
  } catch (e) {
    console.error("Error getting iOS receipt:", e);
    return null;
  }
};

/**
 * Register global listeners for IAP transactions (success/error)
 */
export const setupPurchaseListeners = (
  onSuccess: (receipt: string, purchase: any) => Promise<void>,
  onError: (error: any) => void
) => {
  const RNIap = getIAP();
  if (!RNIap) {
    return () => { };
  }

  const purchaseUpdateSubscription = RNIap.purchaseUpdatedListener(async (purchase: any) => {
    let receipt = purchase.transactionReceipt || purchase.purchaseToken;

    // For iOS, transactionReceipt in StoreKit 2 is a JWS JWT token (starts with eyJ...).
    // The legacy verifyReceipt Apple endpoint requires the actual PKCS7/ASN1 App Store receipt (starts with MII...).
    if (Platform.OS === 'ios') {
      try {
        const appReceipt = await RNIap.getReceiptIOS();
        if (appReceipt) {
          receipt = appReceipt;
        }
      } catch (err) {
        console.warn('Failed to get iOS app receipt, falling back to transactionReceipt:', err);
      }
    }

    if (receipt) {
      try {
        await onSuccess(receipt, purchase);
        await RNIap.finishTransaction({ purchase });
      } catch (err) {
        console.error("Failed to verify/finish purchase:", err);
      }
    }
  });

  const purchaseErrorSubscription = RNIap.purchaseErrorListener((error: any) => {
    onError(error);
  });

  return () => {
    purchaseUpdateSubscription.remove();
    purchaseErrorSubscription.remove();
  };
};

/**
 * Sync subscription status with Apple StoreKit on startup
 */
export const syncSubscriptionStatusWithStoreKit = async (userId: string, token: string, API_URL: string): Promise<any | null> => {
  const RNIap = getIAP();
  if (!RNIap) {
    // In Expo Go, fallback to a simple user profile fetch
    try {
      const res = await fetch(`${API_URL}/auth/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        return data.user;
      }
    } catch (e) {
      console.warn("Failed to fetch profile in simulation mode:", e);
    }
    return null;
  }

  try {
    console.log("Checking active subscriptions from StoreKit...");
    
    // Retrieve currently active/available purchases from StoreKit
    const purchases = await RNIap.getAvailablePurchases();
    
    // Filter for our weekly subscription SKUs
    const activeSubscription = purchases?.find(p => 
      p.productId === 'com.resume.starter' || p.productId === 'com.resume.pro'
    );

    if (activeSubscription) {
      console.log("Found active subscription in StoreKit:", activeSubscription.productId);
      
      // Get the current iOS App Store receipt
      const receipt = await getReceipt();
      if (receipt) {
        // Send receipt to backend to verify and update plan/credits in DB
        const res = await fetch(`${API_URL}/purchase/verify-apple`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            receiptData: receipt,
            deviceId: userId
          })
        });

        if (res.ok) {
          const data = await res.json();
          if (data.success && data.user) {
            return data.user;
          }
        }
      }
    } else {
      console.log("No active subscriptions found in StoreKit. Reverting user to Free...");
      // Tell backend to set user back to Free and reset credits to 0
      const res = await fetch(`${API_URL}/purchase/degrade-to-free`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ deviceId: userId })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.user) {
          return data.user;
        }
      }
    }
  } catch (e) {
    console.warn("Error syncing subscription status with StoreKit:", e);
  }
  return null;
};
