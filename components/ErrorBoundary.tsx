import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Alert, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { copyToClipboard } from '../utils/clipboard';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ error, errorInfo });

    // Also log to the native console for EAS build diagnosis
    if (Platform.OS === 'ios' || Platform.OS === 'android') {
      console.log('--- CRASH LOG REPORT ---');
      console.log(`Error: ${error.message}`);
      console.log(`Stack: ${error.stack}`);
      console.log('------------------------');
    }
  }

  private handleCopyToClipboard = async () => {
    if (!this.state.error) return;
    const errorDetails = `Error: ${this.state.error.message}\n\nStack:\n${this.state.error.stack}\n\nComponent Stack:\n${this.state.errorInfo?.componentStack}`;

    await copyToClipboard(errorDetails, 'Crash logs copied to clipboard.');
  };

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <ErrorFallbackView
          error={this.state.error}
          errorInfo={this.state.errorInfo}
          onCopy={this.handleCopyToClipboard}
          onReset={this.handleReset}
        />
      );
    }

    return this.props.children;
  }
}

// Visual error screen with styling matching the app theme
function ErrorFallbackView({
  error,
  errorInfo,
  onCopy,
  onReset
}: {
  error: Error | null;
  errorInfo: ErrorInfo | null;
  onCopy: () => void;
  onReset: () => void;
}) {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#0f172a', '#0a0e1a', '#030712']} style={StyleSheet.absoluteFillObject} />

      <View style={[styles.content, { paddingTop: Math.max(insets.top, 40), paddingBottom: Math.max(insets.bottom, 20) }]}>
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Ionicons name="bug-outline" size={40} color="#ff6b6b" />
          </View>
          <Text style={styles.title}>Application Crash Caught</Text>
          <Text style={styles.subtitle}>
            An unexpected error occurred during execution. You can copy the logs below to report the bug.
          </Text>
        </View>

        <View style={styles.logWrapper}>
          <Text style={styles.logHeader}>CRASH LOG DETAILS</Text>
          <ScrollView style={styles.scrollLog} contentContainerStyle={styles.scrollContent}>
            <Text style={styles.errorText}>
              {error ? `${error.name}: ${error.message}` : 'Unknown Error'}
            </Text>
            {error?.stack && (
              <Text style={styles.stackText}>{error.stack}</Text>
            )}
            {errorInfo?.componentStack && (
              <Text style={[styles.stackText, { color: '#a0a6b2', marginTop: 12 }]}>
                {errorInfo.componentStack}
              </Text>
            )}
          </ScrollView>
        </View>

        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.copyBtn} activeOpacity={0.8} onPress={onCopy}>
            <Ionicons name="copy-outline" size={18} color="#fff" />
            <Text style={styles.copyBtnText}>Copy Logs</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.resetBtn} activeOpacity={0.8} onPress={onReset}>
            <Ionicons name="refresh-outline" size={18} color="#000" />
            <Text style={styles.resetBtnText}>Restart App</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'space-between',
  },
  header: {
    alignItems: 'center',
    marginTop: 20,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 107, 0.2)',
  },
  title: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    paddingHorizontal: 12,
  },
  logWrapper: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginTop: 24,
    marginBottom: 20,
    overflow: 'hidden',
  },
  logHeader: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    color: '#e28743',
    paddingVertical: 10,
    paddingHorizontal: 16,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  scrollLog: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  errorText: {
    color: '#ff6b6b',
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 12,
  },
  stackText: {
    color: '#cbd5e1',
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
    fontSize: 11,
    lineHeight: 16,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 10,
  },
  copyBtn: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 24,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  copyBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  resetBtn: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 24,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  resetBtnText: {
    color: '#000',
    fontSize: 15,
    fontWeight: '700',
  },
});
