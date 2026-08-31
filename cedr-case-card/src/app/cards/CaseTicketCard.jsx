import React from 'react'
import {
  Flex, Text, Heading, Button, Divider, Tag, hubspot,
} from '@hubspot/ui-extensions'

const PWA_URL = 'https://cedr-mediator-mvp.team-cd8.workers.dev'

hubspot.extend(({ context, actions }) => (
  <CaseTicketCard context={context} actions={actions} />
))

function CaseTicketCard({ context, actions }) {
  const props     = context.crm.objectProperties
  const case_id   = props?.enquiry_number_auto_generated || null
  const subject   = props?.subject                       || null
  const record_id = String(context.crm.objectId)

  function handleOpen() {
    if (!case_id) return
    const params = new URLSearchParams({
      case_id,
      record_id,
      object_type: 'ticket',
      record_name: subject || '',
    })
    actions.openIframeModal({
      uri:    `${PWA_URL}/availability?${params.toString()}`,
      height: 2000,
      width:  1400,
      title:  `Search mediators — ${subject || case_id}`,
      flush:  false,
    })
  }

  return (
    <Flex direction="column" gap="small">
      <Heading>Search available mediators</Heading>
      <Divider />

      <Flex align="center" gap="small">
        <Tag variant="default">Enquiry</Tag>
        <Text format={{ bold: true }}>{subject || 'Untitled'}</Text>
      </Flex>

      {case_id
        ? <Text variant="microcopy">Enquiry ID: {case_id}</Text>
        : <Text variant="microcopy">No enquiry_number_auto_generated set on this ticket.</Text>
      }

      <Divider />

      <Button onClick={handleOpen} variant="primary" disabled={!case_id}>
        Search available mediators
      </Button>
    </Flex>
  )
}
