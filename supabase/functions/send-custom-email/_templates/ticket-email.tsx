import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Text,
  Section,
  Hr,
} from 'npm:@react-email/components@0.0.22'
import * as React from 'npm:react@18.3.1'

interface TicketEmailProps {
  customerName: string
  ticketId: string
  ticketSubject: string
  ticketStatus: string
  ticketPriority: string
  agentName: string
  message: string
  isResolution?: boolean
}

export const TicketEmail = ({
  customerName,
  ticketId,
  ticketSubject,
  ticketStatus,
  ticketPriority,
  agentName,
  message,
  isResolution = false,
}: TicketEmailProps) => (
  <Html>
    <Head />
    <Preview>{isResolution ? 'Your support ticket has been resolved' : 'Update on your support ticket'}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>
          {isResolution ? '✅ Ticket Resolved' : '📩 Ticket Update'}
        </Heading>
        
        <Text style={greeting}>Hello {customerName},</Text>
        
        <Text style={text}>
          {isResolution 
            ? 'Great news! Your support ticket has been resolved.' 
            : 'We have an update on your support ticket.'}
        </Text>

        <Section style={ticketBox}>
          <Heading style={h2}>Ticket Details</Heading>
          <Text style={ticketDetail}><strong>Ticket ID:</strong> #{ticketId}</Text>
          <Text style={ticketDetail}><strong>Subject:</strong> {ticketSubject}</Text>
          <Text style={ticketDetail}><strong>Status:</strong> <span style={getStatusStyle(ticketStatus)}>{ticketStatus.toUpperCase()}</span></Text>
          <Text style={ticketDetail}><strong>Priority:</strong> {ticketPriority.toUpperCase()}</Text>
          <Text style={ticketDetail}><strong>Agent:</strong> {agentName}</Text>
        </Section>

        <Section style={messageBox}>
          <Heading style={h2}>Message from {agentName}:</Heading>
          <Text style={messageText}>{message}</Text>
        </Section>

        <Hr style={hr} />

        <Text style={text}>
          If you have any questions or need to add more information, please reply to this email.
        </Text>

        <Text style={footer}>
          Thank you for choosing our service!<br />
          Best regards,<br />
          <strong>Support Team</strong>
        </Text>

        <Text style={disclaimer}>
          This email was sent regarding your support request. You can reply directly to this email to continue the conversation.
        </Text>
      </Container>
    </Body>
  </Html>
)

const getStatusStyle = (status: string) => {
  const baseStyle = {
    padding: '2px 8px',
    borderRadius: '4px',
    color: 'white',
    fontWeight: 'bold',
  }
  
  switch (status.toLowerCase()) {
    case 'open':
      return { ...baseStyle, backgroundColor: '#3b82f6' }
    case 'in-progress':
      return { ...baseStyle, backgroundColor: '#f59e0b' }
    case 'resolved':
      return { ...baseStyle, backgroundColor: '#10b981' }
    case 'closed':
      return { ...baseStyle, backgroundColor: '#6b7280' }
    default:
      return { ...baseStyle, backgroundColor: '#6b7280' }
  }
}

export default TicketEmail

const main = {
  backgroundColor: '#f6f9fc',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
}

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
  borderRadius: '8px',
  border: '1px solid #e5e7eb',
  maxWidth: '600px',
}

const h1 = {
  color: '#1f2937',
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '40px 20px 20px 20px',
  padding: '0',
}

const h2 = {
  color: '#374151',
  fontSize: '18px',
  fontWeight: 'bold',
  margin: '0 0 12px 0',
}

const greeting = {
  color: '#374151',
  fontSize: '16px',
  margin: '20px 20px 16px 20px',
  fontWeight: '500',
}

const text = {
  color: '#6b7280',
  fontSize: '14px',
  lineHeight: '1.5',
  margin: '16px 20px',
}

const ticketBox = {
  backgroundColor: '#f9fafb',
  border: '1px solid #e5e7eb',
  borderRadius: '6px',
  margin: '20px',
  padding: '20px',
}

const ticketDetail = {
  color: '#374151',
  fontSize: '14px',
  margin: '8px 0',
  lineHeight: '1.4',
}

const messageBox = {
  backgroundColor: '#eff6ff',
  border: '1px solid #dbeafe',
  borderRadius: '6px',
  margin: '20px',
  padding: '20px',
}

const messageText = {
  color: '#1f2937',
  fontSize: '14px',
  lineHeight: '1.6',
  margin: '0',
  whiteSpace: 'pre-wrap' as const,
}

const hr = {
  borderColor: '#e5e7eb',
  margin: '20px 0',
}

const footer = {
  color: '#374151',
  fontSize: '14px',
  lineHeight: '1.5',
  margin: '20px 20px 16px 20px',
}

const disclaimer = {
  color: '#9ca3af',
  fontSize: '12px',
  lineHeight: '1.4',
  margin: '20px',
  textAlign: 'center' as const,
}