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

  useEffect(() => {
    runServerlessFunction({
      name:       'get-case-info-function',
      parameters: { hs_object_id: String(hs_object_id), object_type: 'ticket' },
    }).then(resp => {
      if (resp.status === 'SUCCESS') setData(resp.response.body)
      else setError(resp.response?.message || 'Function error')
    }).catch(e => setError(e.message))
    .finally(() => setLoading(false))
  }, [])

  function handleOpen() {
    if (!data?.case_id) return
    const params = new URLSearchParams({
      case_id:     data.case_id,
      record_id:   String(hs_object_id),
      object_type: 'ticket',
      record_name: data.record_name || '',
    })
    actions.openIframeModal({
      uri:    `${PWA_URL}/availability?${params.toString()}`,
      height: 2000,
      width:  1400,
      title:  `Search mediators — ${data.record_name || data.case_id}`,
      flush:  false,
    })
  }

  if (loading) return (
    <Flex justify="center" align="center" gap="small">
      <LoadingSpinner /><Text>Loading…</Text>
    </Flex>
  )

  if (error) return (
    <Alert title="Error loading ticket" variant="error">{error}</Alert>
  )

  return (
    <Flex direction="column" gap="small">
      <Heading>Search available mediators</Heading>
      <Divider />

      <Flex align="center" gap="small">
        <Tag variant="default">Enquiry</Tag>
        <Text format={{ bold: true }}>{data?.record_name || 'Untitled'}</Text>
      </Flex>

      {data?.case_id
        ? <Text variant="microcopy">ID: {data.case_id}</Text>
        : <Text variant="microcopy">enquiry_number_auto_generated not found. Debug — props: {JSON.stringify(data?._all_props)}</Text>
      }

      <Divider />

      <Button onClick={handleOpen} variant="primary" disabled={!data?.case_id}>
        Search available mediators
      </Button>
    </Flex>
  )
}
