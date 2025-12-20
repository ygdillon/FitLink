import { useState, useEffect } from 'react'
import { Container, Title, Text, Stack, Card, Button, Group, Paper, TextInput, Grid, Loader, ScrollArea, Box } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { useAuth } from '../contexts/AuthContext'
import api from '../services/api'
import './Messages.css'

function Messages() {
  const { user } = useAuth()
  const [messages, setMessages] = useState([])
  const [selectedConversation, setSelectedConversation] = useState(null)
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchConversations()
  }, [])

  const fetchConversations = async () => {
    try {
      const response = await api.get('/messages')
      setMessages(response.data)
    } catch (error) {
      console.error('Error fetching messages:', error)
    }
  }

  const handleSendMessage = async (e) => {
    e.preventDefault()
    if (!newMessage.trim() || !selectedConversation) {
      console.log('❌ Cannot send: missing message or conversation', {
        hasMessage: !!newMessage.trim(),
        hasConversation: !!selectedConversation,
        selectedConversation
      })
      return
    }

    if (!selectedConversation.id) {
      console.error('❌ Selected conversation has no ID:', selectedConversation)
      notifications.show({
        title: 'Error',
        message: 'Invalid conversation selected',
        color: 'red',
      })
      return
    }

    console.log('📤 Sending message:', {
      receiverId: selectedConversation.id,
      receiverIdType: typeof selectedConversation.id,
      receiverName: selectedConversation.name,
      content: newMessage,
      contentLength: newMessage.length,
      selectedConversation
    })

    setLoading(true)
    try {
      const response = await api.post('/messages', {
        receiverId: selectedConversation.id,
        content: newMessage
      })
      console.log('✅ Message sent successfully:', response.data)
      setNewMessage('')
      fetchConversations()
      if (selectedConversation) {
        fetchConversationMessages(selectedConversation.id)
      }
      notifications.show({
        title: 'Success',
        message: 'Message sent successfully',
        color: 'green',
      })
    } catch (error) {
      console.error('❌ Error sending message:', error)
      console.error('Error response:', error.response?.data)
      console.error('Error status:', error.response?.status)
      console.error('Full error:', error)
      
      const errorMessage = error.response?.data?.message || error.message || 'Failed to send message'
      notifications.show({
        title: 'Error',
        message: `${errorMessage} (Status: ${error.response?.status || 'Unknown'})`,
        color: 'red',
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchConversationMessages = async (userId) => {
    try {
      const response = await api.get(`/messages/${userId}`)
      setSelectedConversation(prev => {
        if (!prev || prev.id !== userId) {
          // If the conversation changed, don't update
          return prev
        }
        return {
          ...prev,
          messages: response.data
        }
      })
    } catch (error) {
      console.error('Error fetching conversation:', error)
    }
  }

  const selectConversation = (conversation) => {
    console.log('📋 Selecting conversation:', conversation)
    if (!conversation || !conversation.id) {
      console.error('❌ Invalid conversation selected:', conversation)
      return
    }
    // Set the conversation first, then fetch messages
    setSelectedConversation({
      ...conversation,
      messages: [] // Initialize with empty messages array
    })
    fetchConversationMessages(conversation.id)
  }

  return (
    <Box style={{ display: 'flex', flexDirection: 'column', height: '100%', maxHeight: '100%', overflow: 'hidden' }}>
      <Box style={{ flexShrink: 0, paddingBottom: '1rem' }}>
        <Title order={1}>Messages</Title>
      </Box>
      <Box style={{ flex: 1, minHeight: 0, display: 'flex', overflow: 'hidden' }}>
        <Grid gutter="md" style={{ width: '100%', height: '100%', margin: 0 }}>
          <Grid.Col span={{ base: 12, md: 4 }} style={{ height: '100%', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <Paper p="md" withBorder style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <Title order={2} mb="md" style={{ flexShrink: 0 }}>Conversations</Title>
              {messages.length === 0 ? (
                <Text c="dimmed">No conversations yet</Text>
              ) : (
                <ScrollArea style={{ flex: 1, minHeight: 0 }}>
                  <Stack gap="xs">
                    {messages.map(conv => (
                      <Card
                        key={conv.id}
                        withBorder
                        p="sm"
                        onClick={() => selectConversation(conv)}
                        style={{
                          cursor: 'pointer',
                          backgroundColor: selectedConversation?.id === conv.id ? 'var(--mantine-color-robinhoodGreen-0)' : 'transparent'
                        }}
                      >
                        <Stack gap={4}>
                          <Text fw={500}>{conv.name}</Text>
                          <Text size="sm" c="dimmed" lineClamp={1}>{conv.lastMessage}</Text>
                        </Stack>
                      </Card>
                    ))}
                  </Stack>
                </ScrollArea>
              )}
            </Paper>
          </Grid.Col>

          <Grid.Col span={{ base: 12, md: 8 }} style={{ height: '100%', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <Paper p="md" withBorder style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {selectedConversation ? (
              <>
                <Title order={2} mb="md" style={{ flexShrink: 0 }}>{selectedConversation.name}</Title>
                <ScrollArea style={{ flex: 1, minHeight: 0 }}>
                  <Stack gap="sm" style={{ padding: '0.5rem' }}>
                    {selectedConversation.messages?.map(msg => {
                      // Check if message is from current user (sender_id matches user.id)
                      const isFromCurrentUser = msg.sender_id === user?.id
                      return (
                        <Box
                          key={msg.id}
                          style={{
                            display: 'flex',
                            justifyContent: isFromCurrentUser ? 'flex-end' : 'flex-start',
                            width: '100%'
                          }}
                        >
                          <Card
                            p="sm"
                            withBorder
                            style={{
                              maxWidth: '70%',
                              backgroundColor: isFromCurrentUser 
                                ? 'var(--mantine-color-robinhoodGreen-6)' 
                                : 'var(--mantine-color-gray-1)',
                              color: isFromCurrentUser ? 'white' : 'inherit',
                              borderRadius: 'var(--mantine-radius-md)'
                            }}
                          >
                            <Text size="sm" c={isFromCurrentUser ? 'white' : 'inherit'}>
                              {msg.content}
                            </Text>
                            <Text 
                              size="xs" 
                              c={isFromCurrentUser ? 'rgba(255, 255, 255, 0.8)' : 'dimmed'} 
                              mt={4}
                            >
                              {new Date(msg.timestamp).toLocaleTimeString([], { 
                                hour: '2-digit', 
                                minute: '2-digit' 
                              })}
                            </Text>
                          </Card>
                        </Box>
                      )
                    })}
                  </Stack>
                </ScrollArea>
                <form onSubmit={handleSendMessage} style={{ flexShrink: 0, marginTop: '1rem' }}>
                  <Group>
                    <TextInput
                      style={{ flex: 1 }}
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Type a message..."
                    />
                    <Button type="submit" loading={loading} disabled={!newMessage.trim()}>
                      Send
                    </Button>
                  </Group>
                </form>
              </>
            ) : (
              <Group justify="center" h="100%">
                <Text c="dimmed">Select a conversation to start messaging</Text>
              </Group>
            )}
            </Paper>
          </Grid.Col>
        </Grid>
      </Box>
    </Box>
  )
}

export default Messages

