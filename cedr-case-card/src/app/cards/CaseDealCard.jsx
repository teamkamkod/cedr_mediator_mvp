import React from 'react'
import {
  Flex, Text, Heading, Button, Divider, Tag, hubspot,
} from '@hubspot/ui-extensions'

const PWA_URL = 'https://cedr-mediator-mvp.team-cd8.workers.dev'

hubspot.extend(({ context, actions }) => (
  <CaseDealCard context={context} actions={actions} />
))

function CaseDealCard({ context, actions }) {
  // Properties defined in hsmeta are available directly — no serverless function needed
  const props     = context.crm.objectProperties
  const case_id   = props?.enquiry_id   || null
  const deal_name = props?.dealname     || null
  const record_id = String(context.crm.objectId)

  function handleOpen() {
    if (!case_id) return
    const params = new URLSearchParams({
      case_id,
      record_id,
      object_type: 'deal',
      record_name: deal_name || '',
    })
    actions.openIframeModal({
      uri:    `${PWA_URL}/availability?${params.toString()}`,
      height: 2000,
      width:  1400,
      title:  `Search mediators — ${deal_name || case_id}`,
      flush:  false,
    })
  }

  return (
    <Flex direction="column" gap="small">
      <Heading>Search available mediators</Heading>
      <Divider />

      <Flex align="center" gap="small">
        <Tag variant="info">Case</Tag>
        <Text format={{ bold: true }}>{deal_name || 'Untitled'}</Text>
      </Flex>

      {case_id
        ? <Text variant="microcopy">Case ID: {case_id}</Text>
        : <Text variant="microcopy">No enquiry_id set on this deal.</Text>
      }

      <Divider />

      <Button onClick={handleOpen} variant="primary" disabled={!case_id}>
        Search available mediators
      </Button>
    </Flex>
  )
}
