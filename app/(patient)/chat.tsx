import { useState } from 'react';
import { View, Text, Image, Pressable, ScrollView, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/theme';
import { useChatMessages } from '../../lib/hooks/useChatMessages';
import { formatTime } from '../../lib/formatDate';
import { SOSButton } from '../../components/sos/SOSButton';
import { BottomTabBar } from '../../components/navigation/BottomTabBar';

/** Screen 21/39 — Chat. Static UI; the RAG chatbot backend lands in Phase 4, see docs/Development Plan.md. */
export default function Chat() {
  const { data: messages } = useChatMessages();
  const [draft, setDraft] = useState('');
  const hasMessages = messages.length > 0;

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <View className="flex-1">
        <View className="mt-2 flex-row items-center justify-between px-5">
          <View>
            <Text className="text-lg font-bold text-text-dark">RecovAI Chat</Text>
            <View className="mt-0.5 flex-row items-center">
              <View className="mr-1.5 h-2 w-2 rounded-full" style={{ backgroundColor: colors.riskLow }} />
              <Text className="text-xs text-text-muted">Online</Text>
            </View>
          </View>
          <Ionicons name="ellipsis-vertical" size={20} color={colors.textDark} />
        </View>

        {hasMessages ? (
          <>
            <ScrollView contentContainerClassName="px-5 py-4" showsVerticalScrollIndicator={false}>
              {messages.map((message) => {
                const isPatient = message.sender === 'patient';
                return (
                  <View key={message.id} className={`mb-3 flex-row ${isPatient ? 'justify-end' : 'justify-start'}`}>
                    {!isPatient ? (
                      <View className="mr-2 h-7 w-7 self-end rounded-full" style={{ backgroundColor: colors.primary }} />
                    ) : null}
                    <View style={{ maxWidth: '75%' }}>
                      <View
                        className="rounded-2xl px-4 py-2.5"
                        style={{ backgroundColor: isPatient ? colors.primary : colors.card }}
                      >
                        <Text className="text-sm" style={{ color: isPatient ? '#FFFFFF' : colors.textDark }}>
                          {message.text}
                        </Text>
                      </View>
                      <View className={`mt-1 flex-row items-center ${isPatient ? 'justify-end' : 'justify-start'}`}>
                        <Text className="text-[10px] text-text-muted">{formatTime(message.createdAt)}</Text>
                        {isPatient && message.read ? (
                          <Ionicons name="checkmark-done" size={12} color={colors.primary} style={{ marginLeft: 4 }} />
                        ) : null}
                      </View>
                    </View>
                  </View>
                );
              })}
            </ScrollView>

            <View className="flex-row items-center border-t border-divider px-5 py-3">
              <Ionicons name="attach-outline" size={22} color={colors.textMuted} />
              <TextInput
                value={draft}
                onChangeText={setDraft}
                placeholder="Type a message..."
                placeholderTextColor={colors.textMuted}
                className="ml-2 flex-1 rounded-full bg-card px-4 py-2.5 text-sm text-text-dark"
              />
              <Pressable
                onPress={() => setDraft('')}
                className="ml-2 h-9 w-9 items-center justify-center rounded-full"
                style={{ backgroundColor: colors.primary }}
              >
                <Ionicons name="send" size={16} color="#FFFFFF" />
              </Pressable>
            </View>
          </>
        ) : (
          <View className="flex-1 items-center justify-center px-8">
            <Image
              source={require('../../assets/illustrations/02-two-chat-bubbles.png')}
              style={{ width: 140, height: 140 }}
              resizeMode="contain"
            />
            <Text className="mt-4 text-center text-xl font-bold text-text-dark">Start a conversation</Text>
            <Text className="mt-1 text-center text-sm text-text-muted">
              I&apos;m here to support your recovery journey.
            </Text>

            <Pressable
              onPress={() => console.log('Say Hello pressed')}
              className="mt-6 items-center rounded-2xl px-6 py-3"
              style={{ backgroundColor: colors.primary }}
            >
              <Text className="text-sm font-semibold text-white">Say Hello</Text>
            </Pressable>
          </View>
        )}

        <SOSButton />

        <BottomTabBar active="chat" />
      </View>
    </SafeAreaView>
  );
}
