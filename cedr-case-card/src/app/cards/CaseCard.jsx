import React, { useState, useEffect } from 'react'
import {
  Flex, Text, Heading, Button, Divider, Tag,
  LoadingSpinner, Alert, hubspot,
} from '@hubspot/ui-extensions'

const PWA_URL = 'https://cedr-mediator-mvp.team-cd8.workers.dev'

hubspot.extend(({ context, runServerlessFunction, actions }) => (
  <CaseCard context={context} runServerlessFunction={runServerlessFunction} actions={actions} />
))

function CaseCard({ context, runServerlessFunction, actions }) {
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  const hs_object_id = context.crm.objectId
  // Determine object type from HubSpot objectType in context
  // Deals = '0-3', Tickets = '0-5' — fallback to the card's declared type
  const rawType    = context.crm.objectType || ''
  const object_type = rawType.includes('TICKET') || rawType === '0-5' ? 'ticket' : 'deal'

  useEffect(() => {
    runServerlessFunction({
      name:       'get-case-info-function',
      parameters: { hs_object_id: String(hs_object_id), object_type },
    }).then(resp => {
      if (resp.status === 'SUCCESS') setData(resp.response.body)
      else setError(resp.response?.message || 'Failed to load case info')
    }).catch(e => setError(e.message))
    .finally(() => setLoading(false))
  }, [])

  function handleOpen() {
    if (!data) return
    const params = new URLSearchParams({
      case_id:     data.case_id     || '',
      record_id:   data.record_id,
      object_type: data.object_type,
      record_name: data.record_name || '',
    })
    actions.openIframeModal({
      uri:    `${PWA_URL}/availability?${params.toString()}`,
      height: 2000,
      width:  1400,
      title:  `Search available mediators${data.record_name ? ` — ${data.record_name}` : ''}`,
      flush:  false,
    })
  }

  if (loading) return (
    <Flex justify="center" align="center" gap="small">
      <LoadingSpinner />
      <Text>Loading case info…</Text>
    </Flex>
  )

  if (error) return (
    <Alert title="Could not load case info" variant="error">{error}</Alert>
  )

  return (
    <Flex direction="column" gap="small">
      <Heading>Search available mediators</Heading>
      <Divider />

      <Flex direction="column" gap="extra-small">
        <Flex align="center" gap="small">
          <Tag variant={object_type === 'deal' ? 'info' : 'default'}>
            {object_type === 'deal' ? 'Case' : 'Enquiry'}
          </Tag>
          <Text format={{ bold: true }}>{data?.record_name || 'Untitled'}</Text>
        </Flex>
        {data?.case_id && (
          <Text variant="microcopy">ID: {data.case_id}</Text>
        )}
        {!data?.case_id && (
          <Text variant="microcopy">
            No case ID found. Make sure enquiry_id (deal) or enquiry_number_auto_generated (ticket) is set.
          </Text>
        )}
      </Flex>

      <Divider />

      <Button onClick={handleOpen} variant="primary">
        Search available mediators
      </Button>
    </Flex>
  )
}
