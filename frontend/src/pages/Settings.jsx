import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Container, Title, Text, Tabs, Paper, Card, Avatar, Badge, Button, TextInput, Textarea, Modal, Stack, Group, Alert, Loader, Divider, MultiSelect, Checkbox, SimpleGrid, Collapse } from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'
import { useAuth } from '../contexts/AuthContext'
import ThemeToggle from '../components/ThemeToggle'
import api from '../services/api'
import './Settings.css'

function Settings() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [currentTrainer, setCurrentTrainer] = useState(null)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [selectedSpecialties, setSelectedSpecialties] = useState([])
  const [selectedFitnessGoals, setSelectedFitnessGoals] = useState([])
  const [selectedAgeRanges, setSelectedAgeRanges] = useState([])
  const [selectedSpecialNeeds, setSelectedSpecialNeeds] = useState([])
  const [locationFilter, setLocationFilter] = useState('')
  const [filtersOpen, setFiltersOpen] = useState(false)
  
  // Available options for filters
  const specialtyOptions = [
    'Weight Loss', 'Strength Training', 'Cardio', 'Yoga', 'Pilates',
    'Athletic Performance', 'Rehabilitation', 'Injury Recovery', 'Nutrition Coaching',
    'Bodybuilding', 'Functional Training', 'HIIT', 'Flexibility', 'Endurance Training'
  ]
  
  const fitnessGoalOptions = [
    'Lose weight', 'Build muscle', 'Boost endurance', 'Get toned', 'Gain flexibility'
  ]
  
  const ageRangeOptions = [
    'Younger than 18', '18 - 22 years old', '23 - 30 years old',
    '31 - 40 years old', '41 - 50 years old', '51 - 60 years old', '61+ years old'
  ]
  
  const specialNeedsOptions = [
    'Injuries', 'Chronic Pain', 'Post-Surgery Recovery', 'Mobility Issues',
    'Arthritis', 'Back Problems', 'Knee Issues', 'Shoulder Problems'
  ]
  const [message, setMessage] = useState('')
  const [activeTab, setActiveTab] = useState(user?.role === 'client' ? 'current' : 'account') // 'current', 'find', 'requests', or 'account'
  const [pendingRequests, setPendingRequests] = useState([])
  const [requestMessage, setRequestMessage] = useState('')
  const [opened, { open, close }] = useDisclosure(false)
  const [selectedTrainer, setSelectedTrainer] = useState(null)

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  useEffect(() => {
    fetchCurrentTrainer()
    fetchPendingRequests()
  }, [])

  useEffect(() => {
    // Load all trainers when switching to find tab
    if (user?.role === 'client' && activeTab === 'find' && searchResults.length === 0 && !searching) {
      const loadAllTrainers = async () => {
        setSearching(true)
        setMessage('')
        try {
          const response = await api.get('/client/trainers/search')
          setSearchResults(response.data || [])
          if (response.data.length === 0) {
            setMessage('No trainers available at the moment.')
          }
        } catch (error) {
          console.error('Error fetching trainers:', error)
          setMessage('Failed to load trainers')
        } finally {
          setSearching(false)
        }
      }
      loadAllTrainers()
    }
  }, [activeTab, user?.role])

  const fetchCurrentTrainer = async () => {
    try {
      const response = await api.get('/client/trainer')
      setCurrentTrainer(response.data)
    } catch (error) {
      console.error('Error fetching trainer:', error)
      if (error.response?.status === 404) {
        setCurrentTrainer(null)
      }
    } finally {
      setLoading(false)
    }
  }

  const fetchPendingRequests = async () => {
    try {
      const response = await api.get('/client/trainer/requests')
      setPendingRequests(response.data)
    } catch (error) {
      console.error('Error fetching requests:', error)
    }
  }

  const handleSearch = async (e, loadAll = false) => {
    e?.preventDefault()
    
    // If loadAll is true, fetch all trainers without any filters
    if (loadAll) {
      setSearching(true)
      setMessage('')
      try {
        const response = await api.get('/client/trainers/search')
        setSearchResults(response.data || [])
        if (response.data.length === 0) {
          setMessage('No trainers available at the moment.')
        }
      } catch (error) {
        console.error('Error fetching trainers:', error)
        setMessage('Failed to load trainers')
      } finally {
        setSearching(false)
      }
      return
    }
    
    // Allow search even without text query if filters are selected
    if (!searchQuery.trim() && selectedSpecialties.length === 0 && 
        selectedFitnessGoals.length === 0 && selectedAgeRanges.length === 0 && 
        selectedSpecialNeeds.length === 0 && !locationFilter.trim()) {
      return
    }

    setSearching(true)
    setMessage('')
    try {
      const params = new URLSearchParams()
      if (searchQuery.trim()) {
        params.append('q', searchQuery.trim())
      }
      if (locationFilter.trim()) {
        params.append('location', locationFilter.trim())
      }
      if (selectedSpecialties.length > 0) {
        selectedSpecialties.forEach(spec => params.append('specialties', spec))
      }
      if (selectedFitnessGoals.length > 0) {
        selectedFitnessGoals.forEach(goal => params.append('fitness_goals', goal))
      }
      if (selectedAgeRanges.length > 0) {
        selectedAgeRanges.forEach(age => params.append('client_age_ranges', age))
      }
      if (selectedSpecialNeeds.length > 0) {
        selectedSpecialNeeds.forEach(need => params.append('special_needs', need))
      }
      
      const response = await api.get(`/client/trainers/search?${params.toString()}`)
      setSearchResults(response.data)
      if (response.data.length === 0) {
        setMessage('No trainers found. Try adjusting your search or filters.')
      }
    } catch (error) {
      console.error('Error searching trainers:', error)
      setMessage('Failed to search trainers')
    } finally {
      setSearching(false)
    }
  }
  
  const clearFilters = () => {
    setSearchQuery('')
    setLocationFilter('')
    setSelectedSpecialties([])
    setSelectedFitnessGoals([])
    setSelectedAgeRanges([])
    setSelectedSpecialNeeds([])
    setSearchResults([])
    setMessage('')
    // Reload all trainers after clearing
    handleSearch(null, true)
  }

  const handleRequestTrainer = async (trainerId) => {
    // Check if onboarding is completed
    try {
      const response = await api.get('/client/profile/onboarding-status')
      if (!response.data.onboarding_completed) {
        setMessage('Please complete your profile before requesting a trainer. You will be redirected to complete your profile.')
        setTimeout(() => {
          window.location.href = '/client/onboarding'
        }, 2000)
        return
      }
    } catch (error) {
      console.error('Error checking onboarding status:', error)
      setMessage('Unable to verify profile completion. Please try again.')
      return
    }

    setSelectedTrainer(searchResults.find(t => t.id === trainerId))
    open()
  }

  const submitTrainerRequest = async () => {
    if (!selectedTrainer) return

    try {
      await api.post(`/client/trainer/request`, { 
        trainerId: selectedTrainer.id,
        message: requestMessage.trim() || null
      })
      setMessage('Trainer request sent successfully! The trainer will review your request and get back to you.')
      close()
      setRequestMessage('')
      setSelectedTrainer(null)
      fetchPendingRequests()
      setActiveTab('requests')
    } catch (error) {
      console.error('Error requesting trainer:', error)
      if (error.response?.data?.requires_onboarding) {
        setMessage('Please complete your profile before requesting a trainer. Redirecting to profile setup...')
        setTimeout(() => {
          window.location.href = '/client/onboarding'
        }, 2000)
      } else {
        setMessage(error.response?.data?.message || 'Failed to send trainer request')
      }
    }
  }

  const handleDisconnectTrainer = async () => {
    if (!window.confirm('Are you sure you want to disconnect from your current trainer? You will lose access to their workouts and programs.')) {
      return
    }

    try {
      await api.delete('/client/trainer')
      setMessage('Disconnected from trainer successfully')
      setCurrentTrainer(null)
      setActiveTab('find') // Switch to Find Trainer tab after disconnecting
    } catch (error) {
      console.error('Error disconnecting trainer:', error)
      setMessage(error.response?.data?.message || 'Failed to disconnect from trainer')
    }
  }

  if (loading) {
    return (
      <Container size="xl" py="xl">
        <Group justify="center">
          <Loader size="lg" />
        </Group>
      </Container>
    )
  }

  return (
    <Container size="xl" py="xl">
      <Title order={1} mb="xl">Settings</Title>

      {message && (
        <Alert 
          color={message.includes('success') || message.includes('sent') ? 'green' : 'red'} 
          mb="md"
          onClose={() => setMessage('')}
          withCloseButton
        >
          {message}
        </Alert>
      )}

      <Tabs value={activeTab} onChange={setActiveTab}>
        <Tabs.List>
          {user?.role === 'client' && (
            <>
              <Tabs.Tab value="current">Current Trainer</Tabs.Tab>
              {!currentTrainer && (
                <>
                  <Tabs.Tab value="requests">
                    Requests {pendingRequests.length > 0 && `(${pendingRequests.length})`}
                  </Tabs.Tab>
                  <Tabs.Tab value="find">Find Trainer</Tabs.Tab>
                </>
              )}
            </>
          )}
          <Tabs.Tab value="account">Account</Tabs.Tab>
        </Tabs.List>

        {user?.role === 'client' && (
          <Tabs.Panel value="current" pt="md">
          <Title order={2} mb="md">Your Current Trainer</Title>
          {currentTrainer ? (
            <Card shadow="sm" padding="lg" radius="md" withBorder>
              <Stack gap="md">
                <Group>
                  <Avatar color="green" size="lg" radius="xl">
                    {currentTrainer.name.charAt(0).toUpperCase()}
                  </Avatar>
                  <div style={{ flex: 1 }}>
                    <Title order={4}>{currentTrainer.name}</Title>
                    <Text c="dimmed">{currentTrainer.email}</Text>
                    {currentTrainer.phoneNumber && (
                      <Text size="sm" c="dimmed">📞 {currentTrainer.phoneNumber}</Text>
                    )}
                  </div>
                </Group>
                {currentTrainer.bio && (
                  <Text>{currentTrainer.bio}</Text>
                )}
                {currentTrainer.specialties && currentTrainer.specialties.length > 0 && (
                  <div>
                    <Text fw={500} mb="xs">Specialties:</Text>
                    <Group gap="xs">
                      {(Array.isArray(currentTrainer.specialties) 
                        ? currentTrainer.specialties 
                        : Object.values(currentTrainer.specialties)
                      ).map((spec, idx) => (
                        <Badge key={idx} variant="light">{spec}</Badge>
                      ))}
                    </Group>
                  </div>
                )}
                {currentTrainer.hourly_rate && (
                  <Text><Text span fw={500}>Rate:</Text> ${currentTrainer.hourly_rate}/hour</Text>
                )}
                <Button color="red" variant="outline" onClick={handleDisconnectTrainer}>
                  Disconnect from Trainer
                </Button>
              </Stack>
            </Card>
          ) : (
            <Paper p="xl" withBorder>
              <Stack gap="xs" align="center">
                <Text c="dimmed">You don't have a trainer assigned yet.</Text>
                <Text c="dimmed" size="sm">Use the "Find Trainer" tab to search for and connect with a trainer.</Text>
              </Stack>
            </Paper>
          )}
          </Tabs.Panel>
        )}

        {user?.role === 'client' && (
          <Tabs.Panel value="requests" pt="md">
          <Title order={2} mb="md">Trainer Requests</Title>
          {pendingRequests.length > 0 ? (
            <Stack gap="md">
              {pendingRequests.map(request => (
                <Card key={request.id} shadow="sm" padding="lg" radius="md" withBorder>
                  <Stack gap="sm">
                    <Group justify="space-between">
                      <div>
                        <Title order={4}>{request.trainerName}</Title>
                        <Text size="sm" c="dimmed">{request.trainerEmail}</Text>
                      </div>
                      <Badge 
                        color={
                          request.status === 'approved' ? 'green' : 
                          request.status === 'rejected' ? 'red' : 'yellow'
                        }
                      >
                        {request.status === 'pending' && '⏳ Pending'}
                        {request.status === 'approved' && '✓ Approved'}
                        {request.status === 'rejected' && '✗ Rejected'}
                      </Badge>
                    </Group>
                    {request.message && (
                      <div>
                        <Text fw={500} size="sm" mb="xs">Your Message:</Text>
                        <Text size="sm">{request.message}</Text>
                      </div>
                    )}
                    {request.trainerResponse && (
                      <Alert color="blue" title="Trainer Response">
                        {request.trainerResponse}
                      </Alert>
                    )}
                    <Text size="xs" c="dimmed">
                      Sent: {new Date(request.createdAt).toLocaleDateString()}
                    </Text>
                  </Stack>
                </Card>
              ))}
            </Stack>
          ) : (
            <Paper p="xl" withBorder>
              <Stack gap="xs" align="center">
                <Text c="dimmed">You don't have any trainer requests yet.</Text>
                <Text c="dimmed" size="sm">Use the "Find Trainer" tab to search for and request a trainer.</Text>
              </Stack>
            </Paper>
          )}
          </Tabs.Panel>
        )}

        {user?.role === 'client' && (
          <Tabs.Panel value="find" pt="md">
            <Title order={2} mb="md">Find a New Trainer</Title>
            
            {/* Search Bar */}
            <form onSubmit={handleSearch}>
              <Group mb="md">
                <TextInput
                  placeholder="Search by name, specialty, or needs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ flex: 1 }}
                />
                <Button type="submit" loading={searching}>
                  Search
                </Button>
                <Button variant="light" onClick={() => setFiltersOpen(!filtersOpen)}>
                  {filtersOpen ? 'Hide Filters' : 'Show Filters'}
                </Button>
                {(selectedSpecialties.length > 0 || selectedFitnessGoals.length > 0 || 
                  selectedAgeRanges.length > 0 || selectedSpecialNeeds.length > 0) && (
                  <Button variant="subtle" onClick={clearFilters}>
                    Clear Filters
                  </Button>
                )}
              </Group>
            </form>

            {/* Advanced Filters */}
            <Collapse in={filtersOpen} mb="lg">
              <Paper p="md" withBorder>
                <Stack gap="md">
                  <Title order={4}>Filter by Your Needs</Title>
                  
                  <MultiSelect
                    label="Specialties"
                    placeholder="Select specialties (e.g., Injury Recovery, Weight Loss)"
                    data={specialtyOptions}
                    value={selectedSpecialties}
                    onChange={setSelectedSpecialties}
                    searchable
                    clearable
                  />
                  
                  <MultiSelect
                    label="Fitness Goals"
                    placeholder="Select your fitness goals"
                    data={fitnessGoalOptions}
                    value={selectedFitnessGoals}
                    onChange={setSelectedFitnessGoals}
                    clearable
                  />
                  
                  <MultiSelect
                    label="Your Age Range"
                    placeholder="Select your age range"
                    data={ageRangeOptions}
                    value={selectedAgeRanges}
                    onChange={setSelectedAgeRanges}
                    clearable
                  />
                  
                  <MultiSelect
                    label="Special Needs"
                    placeholder="Select if you have injuries or special needs"
                    data={specialNeedsOptions}
                    value={selectedSpecialNeeds}
                    onChange={setSelectedSpecialNeeds}
                    searchable
                    clearable
                  />
                  
                  <TextInput
                    label="Location"
                    placeholder="e.g., New York, NY or Los Angeles, CA"
                    value={locationFilter}
                    onChange={(e) => setLocationFilter(e.target.value)}
                    description="Search for trainers in a specific location"
                  />
                  
                  <Button onClick={handleSearch} loading={searching}>
                    Apply Filters
                  </Button>
                </Stack>
              </Paper>
            </Collapse>

            {message && (
              <Alert color={message.includes('No trainers') ? 'yellow' : 'red'} mb="md">
                {message}
              </Alert>
            )}

            {searchResults.length > 0 && (
              <>
                <Title order={3} mb="md">Search Results ({searchResults.length})</Title>
                <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="lg">
                  {searchResults.map(trainer => (
                    <Card 
                      key={trainer.id} 
                      shadow="md" 
                      padding="lg" 
                      radius="md" 
                      withBorder 
                      style={{ 
                        transition: 'transform 0.2s, box-shadow 0.2s',
                        cursor: 'pointer',
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column'
                      }}
                      className="trainer-profile-card"
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-4px)'
                        e.currentTarget.style.boxShadow = '0 8px 16px rgba(0,0,0,0.1)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)'
                        e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)'
                      }}
                    >
                      <Stack gap="md" style={{ flex: 1 }}>
                        {/* Profile Picture and Name */}
                        <Group gap="md">
                          <Avatar 
                            src={trainer.profile_image} 
                            color="robinhoodGreen" 
                            size={80} 
                            radius="50%"
                          >
                            {trainer.name.charAt(0).toUpperCase()}
                          </Avatar>
                          <Stack gap={4} style={{ flex: 1 }}>
                            <Title order={4} lineClamp={1}>{trainer.name}</Title>
                            {/* Rating placeholder - can be enhanced later */}
                            <Group gap="xs">
                              <Text size="sm" c="green" fw={500}>Exceptional 5.0</Text>
                              <Text size="sm" c="dimmed">({trainer.total_clients || 0} clients)</Text>
                            </Group>
                            {trainer.location && (
                              <Text size="xs" c="dimmed">📍 {trainer.location}</Text>
                            )}
                          </Stack>
                        </Group>

                        {/* Specialties */}
                        {trainer.specialties && trainer.specialties.length > 0 && (
                          <div>
                            <Text size="xs" fw={600} c="dimmed" mb="xs" tt="uppercase">Specialties</Text>
                            <Group gap="xs">
                              {(Array.isArray(trainer.specialties) 
                                ? trainer.specialties 
                                : Object.values(trainer.specialties)
                              ).slice(0, 3).map((spec, idx) => (
                                <Badge key={idx} size="sm" variant="light" color="blue">
                                  {spec}
                                </Badge>
                              ))}
                              {(Array.isArray(trainer.specialties) 
                                ? trainer.specialties 
                                : Object.values(trainer.specialties)
                              ).length > 3 && (
                                <Text size="xs" c="dimmed">+{(Array.isArray(trainer.specialties) ? trainer.specialties : Object.values(trainer.specialties)).length - 3} more</Text>
                              )}
                            </Group>
                          </div>
                        )}

                        {/* Bio Preview */}
                        {trainer.bio && (
                          <Text size="sm" c="dimmed" lineClamp={2} style={{ flex: 1 }}>
                            {trainer.bio}
                          </Text>
                        )}

                        {/* Price and Action */}
                        <Group justify="space-between" align="flex-end" mt="auto">
                          <div>
                            {trainer.hourly_rate ? (
                              <>
                                <Text size="xl" fw={700}>
                                  ${trainer.hourly_rate}
                                </Text>
                                <Text size="xs" c="dimmed">per hour</Text>
                              </>
                            ) : (
                              <Text size="sm" c="dimmed">Contact for price</Text>
                            )}
                          </div>
                          {currentTrainer && currentTrainer.id === trainer.id ? (
                            <Button disabled size="sm" variant="light">Current Trainer</Button>
                          ) : pendingRequests.some(r => r.trainerId === trainer.id && r.status === 'pending') ? (
                            <Button disabled size="sm" variant="outline">Request Pending</Button>
                          ) : (
                            <Button 
                              onClick={(e) => {
                                e.stopPropagation()
                                handleRequestTrainer(trainer.id)
                              }}
                              size="sm"
                              color="blue"
                            >
                              View Profile
                            </Button>
                          )}
                        </Group>
                      </Stack>
                    </Card>
                  ))}
                </SimpleGrid>
              </>
            )}

            {searchResults.length === 0 && !searching && (searchQuery.trim() || selectedSpecialties.length > 0 || 
              selectedFitnessGoals.length > 0 || selectedAgeRanges.length > 0 || selectedSpecialNeeds.length > 0) && (
              <Paper p="xl" withBorder>
                <Stack gap="xs" align="center">
                  <Text c="dimmed">No trainers found matching your criteria.</Text>
                  <Text c="dimmed" size="sm">Try adjusting your search or filters.</Text>
                </Stack>
              </Paper>
            )}
          </Tabs.Panel>
        )}

        <Tabs.Panel value="account" pt="md">
          <Title order={2} mb="md">Account Settings</Title>
          <Paper p="lg" withBorder>
            <Stack gap="md">
              <div>
                <Title order={4} mb="xs">Account Information</Title>
                <Text c="dimmed" mb="md">Manage your account settings and preferences</Text>
              </div>
              
              <Divider />
              
              <div>
                <Title order={4} mb="xs">Appearance</Title>
                <Text c="dimmed" mb="md" size="sm">
                  Choose between light and dark theme
                </Text>
                <Group>
                  <ThemeToggle />
                </Group>
              </div>
              
              <Divider />
              
              <div>
                <Title order={4} mb="xs">Sign Out</Title>
                <Text c="dimmed" mb="md" size="sm">
                  Sign out of your Trainr account. You'll need to sign in again to access your account.
                </Text>
                <Button 
                  color="red" 
                  variant="filled" 
                  onClick={handleLogout}
                >
                  Sign Out
                </Button>
              </div>
            </Stack>
          </Paper>
        </Tabs.Panel>
      </Tabs>

      <Modal 
        opened={opened} 
        onClose={close} 
        title={`Request Trainer: ${selectedTrainer?.name}`}
      >
        <Stack gap="md">
          <Text size="sm" c="dimmed">
            Send a message to introduce yourself and explain your fitness goals. This helps the trainer understand if they can help you.
          </Text>
          <Textarea
            label="Message (Optional but Recommended)"
            placeholder="Hi! I'm interested in working with you because... My goals are..."
            value={requestMessage}
            onChange={(e) => setRequestMessage(e.target.value)}
            rows={5}
          />
          <Group justify="flex-end">
            <Button variant="outline" onClick={() => {
              close()
              setRequestMessage('')
              setSelectedTrainer(null)
            }}>
              Cancel
            </Button>
            <Button onClick={submitTrainerRequest}>
              Send Request
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Container>
  )
}

export default Settings

