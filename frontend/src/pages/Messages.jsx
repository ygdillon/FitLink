import { useState, useEffect } from 'react'
import { Container, Title, Text, Stack, Card, Button, Group, Paper, TextInput, Grid, Loader, ScrollArea } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import api from '../services/api'
import './Messages.css'

function Messages() {
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
    if (!newMessage.trim() || !selectedConversation) return

    setLoading(true)
    try {
      await api.post('/messages', {
        receiverId: selectedConversation.id,
        content: newMessage
      })
      setNewMessage('')
      fetchConversations()
      if (selectedConversation) {
        fetchConversationMessages(selectedConversation.id)
      }
    } catch (error) {
      console.error('Error sending message:', error)
      notifications.show({
        title: 'Error',
        message: 'Failed to send message',
        color: 'red',
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchConversationMessages = async (userId) => {
    try {
      const response = await api.get(`/messages/${userId}`)
      setSelectedConversation({
        ...selectedConversation,
        messages: response.data
      })
    } catch (error) {
      console.error('Error fetching conversation:', error)
    }
  }

  const selectConversation = (conversation) => {
    setSelectedConversation(conversation)
    fetchConversationMessages(conversation.id)
  }

  return (
    <Container size="xl" py="xl">
      <Title order={1} mb="xl">Messages</Title>
      <Grid>
        <Grid.Col span={{ base: 12, md: 4 }}>
          <Paper p="md" withBorder style={{ height: '600px' }}>
            <Title order={2} mb="md">Conversations</Title>
            {messages.length === 0 ? (
              <Text c="dimmed">No conversations yet</Text>
            ) : (
              <ScrollArea style={{ height: '500px' }}>
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

        <Grid.Col span={{ base: 12, md: 8 }}>
          <Paper p="md" withBorder style={{ height: '600px', display: 'flex', flexDirection: 'column' }}>
            {selectedConversation ? (
              <>
                <Title order={2} mb="md">{selectedConversation.name}</Title>
                <ScrollArea style={{ flex: 1, marginBottom: '1rem' }}>
                  <Stack gap="sm">
                    {selectedConversation.messages?.map(msg => (
                      <Card
                        key={msg.id}
                        p="sm"
                        withBorder
                        style={{
                          alignSelf: msg.senderId === selectedConversation.id ? 'flex-start' : 'flex-end',
                          maxWidth: '70%',
                          marginLeft: msg.senderId === selectedConversation.id ? 0 : 'auto',
                          marginRight: msg.senderId === selectedConversation.id ? 'auto' : 0,
                          backgroundColor: msg.senderId === selectedConversation.id ? 'var(--mantine-color-gray-1)' : 'var(--mantine-color-robinhoodGreen-1)'
                        }}
                      >
                        <Text size="sm">{msg.content}</Text>
                        <Text size="xs" c="dimmed" mt={4}>
                          {new Date(msg.timestamp).toLocaleTimeString()}
                        </Text>
                      </Card>
                    ))}
                  </Stack>
                </ScrollArea>
                <form onSubmit={handleSendMessage}>
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
    </Container>
  )
}

export default Messages

