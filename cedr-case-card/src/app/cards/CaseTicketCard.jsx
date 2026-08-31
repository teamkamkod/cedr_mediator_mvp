import React, { useState, useEffect } from 'react'
import { Flex, Text, Heading, Button, Divider, Tag, LoadingSpinner, Alert, hubspot } from '@hubspot/ui-extensions'

const PWA_URL = 'https://cedr-mediator-mvp.team-cd8.workers.dev'

hubspot.extend(({ context, runServerlessFunction, actions }) => (
  <CaseTicketCard context={context} runServerlessFunction={runServerlessFunction} actions={actions} />
))

function CaseTicketCard({ context, runServerlessFunction, actions }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    runServerlessFunction({
      name: 'get-case-info-function',
      parameters: { hs_object_id: String(context.crm.objectId), object_type: 'ticket' },
    }).then(resp => {
      if (resp.status === 'SUCCESS') setData(resp.response.body)
      else setError(resp.response?.message || 'Error')
    }).catch(e => setError(e.message)).finally(() => setLoading(false))
  }, [])

  function handleOpen() {
    if (!data?.case_id) return
    const p = new URLSearchParams({ case_id: data.case_id, record_id: String(context.crm.objectId), object_type: 'ticket', record_name: data.record_name || '' })
    actions.openIframeModal({ uri: `${PWA_URL}/availability?${p}`, height: 2000, width: 1400, title: `Search mediators — ${data.record_name || data.case_id}`, flush: false })
  }

  if (loading) return <Flex justify="center" align="center" gap="small"><LoadingSpinner /><Text>Loading…</Text></Flex>
  if (error)   return <Alert title="Error" variant="error">{error}</Alert>

  return (
    <Flex direction="column" gap="small">
      <Heading>Search available mediators</Heading>
      <Divider />
      <Flex align="center" gap="small">
        <Tag variant="default">Enquiry</Tag>
        <Text format={{ bold: true }}>{data?.record_name || 'Untitled'}</Text>
      </Flex>
      {data?.case_id ? <Text variant="microcopy">ID: {data.case_id}</Text> : <Text variant="microcopy">No enquiry_number_auto_generated set on this ticket.</Text>}
      <Divider />
      <Button onClick={handleOpen} variant="primary" disabled={!data?.case_id}>Search available mediators</Button>
    </Flex>
  )
}
