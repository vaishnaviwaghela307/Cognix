/**
 * Language Switcher Component
 * Allows users to switch the app language
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  FlatList,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage, SUPPORTED_LANGUAGES } from '@/contexts/LanguageContext';
import { COLORS, SPACING, TYPOGRAPHY, BORDER_RADIUS, SHADOWS } from '@/constants/theme';

interface LanguageSwitcherProps {
  compact?: boolean; // Show only flag icon
  showLabel?: boolean;
}

export default function LanguageSwitcher({ compact = false, showLabel = true }: LanguageSwitcherProps) {
  const { currentLanguage, setLanguage, isTranslating, strings } = useLanguage();
  const [modalVisible, setModalVisible] = useState(false);

  const currentLang = SUPPORTED_LANGUAGES.find(l => l.code === currentLanguage) || SUPPORTED_LANGUAGES[0];

  const handleLanguageSelect = async (langCode: string) => {
    await setLanguage(langCode);
    setModalVisible(false);
  };

  const renderLanguageItem = ({ item }: { item: typeof SUPPORTED_LANGUAGES[0] }) => {
    const isSelected = item.code === currentLanguage;
    
    return (
      <TouchableOpacity
        style={[styles.languageItem, isSelected && styles.languageItemSelected]}
        onPress={() => handleLanguageSelect(item.code)}
      >
        <Text style={styles.flag}>{item.flag}</Text>
        <View style={styles.languageInfo}>
          <Text style={[styles.languageName, isSelected && styles.languageNameSelected]}>
            {item.name}
          </Text>
          <Text style={styles.nativeName}>{item.nativeName}</Text>
        </View>
        {isSelected && (
          <Ionicons name="checkmark-circle" size={24} color={COLORS.primary} />
        )}
      </TouchableOpacity>
    );
  };

  if (compact) {
    return (
      <TouchableOpacity
        style={styles.compactButton}
        onPress={() => setModalVisible(true)}
      >
        <Text style={styles.compactFlag}>{currentLang.flag}</Text>
        {isTranslating && (
          <ActivityIndicator size="small" color={COLORS.primary} style={styles.loader} />
        )}
        
        <Modal
          visible={modalVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{strings.selectLanguage}</Text>
                <TouchableOpacity onPress={() => setModalVisible(false)}>
                  <Ionicons name="close" size={24} color={COLORS.text} />
                </TouchableOpacity>
              </View>
              
              <Text style={styles.noteText}>
                {strings.testQuestionsEnglishOnly}
              </Text>
              
              <FlatList
                data={SUPPORTED_LANGUAGES}
                renderItem={renderLanguageItem}
                keyExtractor={(item) => item.code}
                showsVerticalScrollIndicator={false}
              />
            </View>
          </View>
        </Modal>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={styles.button}
      onPress={() => setModalVisible(true)}
    >
      <View style={styles.buttonContent}>
        <Text style={styles.flag}>{currentLang.flag}</Text>
        {showLabel && (
          <Text style={styles.buttonText}>{currentLang.name}</Text>
        )}
        <Ionicons name="chevron-down" size={16} color={COLORS.textSecondary} />
        {isTranslating && (
          <ActivityIndicator size="small" color={COLORS.primary} style={styles.loader} />
        )}
      </View>

      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{strings.selectLanguage}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.noteContainer}>
              <Ionicons name="information-circle" size={20} color={COLORS.warning} />
              <Text style={styles.noteText}>
                {strings.testQuestionsEnglishOnly}
              </Text>
            </View>
            
            <FlatList
              data={SUPPORTED_LANGUAGES}
              renderItem={renderLanguageItem}
              keyExtractor={(item) => item.code}
              showsVerticalScrollIndicator={false}
            />
          </View>
        </View>
      </Modal>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.full,
    ...SHADOWS.sm,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  buttonText: {
    ...TYPOGRAPHY.body,
    color: COLORS.text,
    marginHorizontal: SPACING.xs,
  },
  flag: {
    fontSize: 24,
  },
  compactButton: {
    padding: SPACING.sm,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.surface + '80',
  },
  compactFlag: {
    fontSize: 28,
  },
  loader: {
    marginLeft: SPACING.xs,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: BORDER_RADIUS.xl,
    borderTopRightRadius: BORDER_RADIUS.xl,
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xxl,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.text,
  },
  noteContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.warning + '15',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    marginVertical: SPACING.md,
    gap: SPACING.sm,
  },
  noteText: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textSecondary,
    flex: 1,
  },
  languageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border + '30',
  },
  languageItemSelected: {
    backgroundColor: COLORS.primary + '10',
    borderRadius: BORDER_RADIUS.md,
    marginVertical: SPACING.xs,
  },
  languageInfo: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  languageName: {
    ...TYPOGRAPHY.body,
    color: COLORS.text,
    fontWeight: '500',
  },
  languageNameSelected: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  nativeName: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textSecondary,
  },
});
