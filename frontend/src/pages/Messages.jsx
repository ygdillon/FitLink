import { useState, useEffect } from 'react'
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
      alert('Failed to send message')
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
    <div className="messages-container">
      <h1>Messages</h1>
      <div className="messages-layout">
        <div className="conversations-list">
          <h2>Conversations</h2>
          {messages.length === 0 ? (
            <p>No conversations yet</p>
          ) : (
            <ul>
              {messages.map(conv => (
                <li
                  key={conv.id}
                  onClick={() => selectConversation(conv)}
                  className={selectedConversation?.id === conv.id ? 'active' : ''}
                >
                  <div>
                    <strong>{conv.name}</strong>
                    <span className="conversation-preview">{conv.lastMessage}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="conversation-view">
          {selectedConversation ? (
            <>
              <div className="conversation-header">
                <h2>{selectedConversation.name}</h2>
              </div>
              <div className="messages-list">
                {selectedConversation.messages?.map(msg => (
                  <div key={msg.id} className={`message ${msg.senderId === selectedConversation.id ? 'received' : 'sent'}`}>
                    <p>{msg.content}</p>
                    <span className="message-time">
                      {new Date(msg.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                ))}
              </div>
              <form onSubmit={handleSendMessage} className="message-input-form">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                />
                <button type="submit" disabled={loading || !newMessage.trim()}>
                  Send
                </button>
              </form>
            </>
          ) : (
            <div className="no-conversation">
              <p>Select a conversation to start messaging</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Messages

