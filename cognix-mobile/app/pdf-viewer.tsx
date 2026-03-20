import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator, Text, TouchableOpacity, Platform, Linking, Alert } from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

export default function PDFViewerScreen() {
  const router = useRouter();
  const { url, title } = useLocalSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  
  const pdfUrl = Array.isArray(url) ? url[0] : url;
  const pdfTitle = Array.isArray(title) ? title[0] : title || 'Medical Report';

  const isLocalUrl = pdfUrl.includes('192.168.') || pdfUrl.includes('10.') || pdfUrl.includes('localhost');

  // iOS renders PDFs natively, Android needs Google Docs viewer for remote URLs
  // Local URLs on Android CANNOT be previewed in WebView
  const viewerUrl = Platform.select({
    ios: pdfUrl,
    android: isLocalUrl ? null : `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(pdfUrl)}`,
    default: pdfUrl
  });

  const openInBrowser = () => {
    Linking.openURL(pdfUrl);
  };

  const downloadAndOpen = async () => {
    try {
      setDownloading(true);
      const filename = pdfTitle.replace(/\s+/g, '_').toLowerCase() + '.pdf';
      const fileUri = ((FileSystem as any).documentDirectory || (FileSystem as any).cacheDirectory || '') + filename;
      
      const downloadResumable = FileSystem.createDownloadResumable(pdfUrl, fileUri);
      const result = await downloadResumable.downloadAsync();
      
      if (result) {
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(result.uri);
        } else {
          Alert.alert('Sharing not available', 'Please open the PDF in your browser.');
        }
      }
    } catch (e) {
      console.error('Download error:', e);
      Alert.alert('Error', 'Failed to download PDF. Try opening in browser.');
    } finally {
      setDownloading(false);
    }
  };

  // If Android and local URL, we should probably just offer to download/open immediately
  // since WebView will definitely show a blank screen.
  useEffect(() => {
    if (Platform.OS === 'android' && isLocalUrl && !downloading) {
      // Logic here if needed
    }
  }, [isLocalUrl, downloading]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="close" size={24} color="#1E293B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{pdfTitle}</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity style={styles.shareBtn} onPress={downloadAndOpen} disabled={downloading}>
            {downloading ? (
              <ActivityIndicator size="small" color="#6366F1" />
            ) : (
              <Ionicons name="download-outline" size={22} color="#6366F1" />
            )}
          </TouchableOpacity>
          <TouchableOpacity style={styles.shareBtn} onPress={openInBrowser}>
            <Ionicons name="globe-outline" size={22} color="#6366F1" />
          </TouchableOpacity>
        </View>
      </View>

      {/* PDF Viewer */}
      {Platform.OS === 'android' && isLocalUrl ? (
        <View style={styles.errorContainer}>
          <Ionicons name="document-text-outline" size={80} color="#6366F1" />
          <Text style={styles.errorTitle}>PDF Preview Unavailable</Text>
          <Text style={styles.errorText}>
            Local network PDFs cannot be previewed directly on Android. 
            Please download to view or share.
          </Text>
          <TouchableOpacity style={styles.retryBtn} onPress={downloadAndOpen}>
            <Text style={styles.retryBtnText}>Download & Open PDF</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.retryBtn, { backgroundColor: '#F1F5F9', marginTop: 12 }]} onPress={openInBrowser}>
            <Text style={[styles.retryBtnText, { color: '#6366F1' }]}>Open in Browser</Text>
          </TouchableOpacity>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color="#EF4444" />
          <Text style={styles.errorTitle}>Cannot Preview PDF</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={downloadAndOpen}>
            <Text style={styles.retryBtnText}>Try Downloading Instead</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <WebView
          source={{ uri: viewerUrl || '' }}
          style={styles.webview}
          startInLoadingState={true}
          renderLoading={() => (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#6366F1" />
              <Text style={styles.loadingText}>Loading PDF Report...</Text>
              {Platform.OS === 'android' && (
                <Text style={styles.hintText}>Using Google Docs Viewer. If it stays blank, tap the Download icon above.</Text>
              )}
            </View>
          )}
          onError={(syntheticEvent) => {
            const { nativeEvent } = syntheticEvent;
            console.error('WebView error:', nativeEvent);
            setError(nativeEvent.description);
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
    marginHorizontal: 12,
  },
  shareBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  webview: {
    flex: 1,
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    zIndex: 1,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748B',
    fontWeight: '600',
  },
  hintText: {
    marginTop: 8,
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
    backgroundColor: '#fff',
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E293B',
    marginTop: 16,
  },
  errorText: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  retryBtn: {
    backgroundColor: '#6366F1',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
  },
  retryBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
});
