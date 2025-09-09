import express from 'express';
import cors from 'cors';
import { AuthService } from './auth';
import { TicketModel, ContactModel, ProfileModel, OrganizationModel } from './models';

const app = express();
const PORT = process.env.SQLITE_PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Auth middleware
const authenticateToken = async (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.sendStatus(401);
  }

  const user = await AuthService.verifyToken(token);
  if (!user) {
    return res.sendStatus(403);
  }

  req.user = user;
  const profile = ProfileModel.getByUserId(user.id);
  req.profile = profile;
  next();
};

// Auth routes
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, organizationName } = req.body;
    const result = await AuthService.register(email, password, organizationName);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await AuthService.login(email, password);
    res.json(result);
  } catch (error: any) {
    res.status(401).json({ error: error.message });
  }
});

app.get('/api/auth/me', authenticateToken, async (req: any, res) => {
  const userWithProfile = await AuthService.getCurrentUser(req.headers['authorization'].split(' ')[1]);
  res.json(userWithProfile);
});

// Ticket routes
app.get('/api/tickets', authenticateToken, (req: any, res) => {
  try {
    const organizationId = req.profile?.organization_id;
    if (!organizationId) {
      return res.status(400).json({ error: 'No organization found' });
    }

    const tickets = TicketModel.getAll(organizationId, req.query);
    res.json(tickets);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/tickets/:id', authenticateToken, (req: any, res) => {
  try {
    const organizationId = req.profile?.organization_id;
    if (!organizationId) {
      return res.status(400).json({ error: 'No organization found' });
    }

    const ticket = TicketModel.getById(req.params.id, organizationId);
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }
    res.json(ticket);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/tickets', authenticateToken, (req: any, res) => {
  try {
    const organizationId = req.profile?.organization_id;
    if (!organizationId) {
      return res.status(400).json({ error: 'No organization found' });
    }

    const ticketData = {
      ...req.body,
      organization_id: organizationId,
      created_by: req.user.id
    };

    const ticket = TicketModel.create(ticketData);
    res.status(201).json(ticket);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.patch('/api/tickets/:id', authenticateToken, (req: any, res) => {
  try {
    const organizationId = req.profile?.organization_id;
    if (!organizationId) {
      return res.status(400).json({ error: 'No organization found' });
    }

    const ticket = TicketModel.update(req.params.id, organizationId, req.body);
    res.json(ticket);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/tickets/:id', authenticateToken, (req: any, res) => {
  try {
    const organizationId = req.profile?.organization_id;
    if (!organizationId) {
      return res.status(400).json({ error: 'No organization found' });
    }

    const success = TicketModel.delete(req.params.id, organizationId);
    if (success) {
      res.status(204).send();
    } else {
      res.status(404).json({ error: 'Ticket not found' });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Contact routes
app.get('/api/contacts', authenticateToken, (req: any, res) => {
  try {
    const organizationId = req.profile?.organization_id;
    if (!organizationId) {
      return res.status(400).json({ error: 'No organization found' });
    }

    const contacts = ContactModel.getAll(organizationId);
    res.json(contacts);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/contacts', authenticateToken, (req: any, res) => {
  try {
    const organizationId = req.profile?.organization_id;
    if (!organizationId) {
      return res.status(400).json({ error: 'No organization found' });
    }

    const contactData = {
      ...req.body,
      organization_id: organizationId,
      created_by: req.user.id
    };

    const contact = ContactModel.create(contactData);
    res.status(201).json(contact);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Organization routes
app.get('/api/organization', authenticateToken, (req: any, res) => {
  try {
    const organizationId = req.profile?.organization_id;
    if (!organizationId) {
      return res.status(400).json({ error: 'No organization found' });
    }

    const organization = OrganizationModel.getById(organizationId);
    res.json(organization);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Profile routes
app.get('/api/profiles', authenticateToken, (req: any, res) => {
  try {
    const organizationId = req.profile?.organization_id;
    if (!organizationId) {
      return res.status(400).json({ error: 'No organization found' });
    }

    const profiles = ProfileModel.getAllByOrganization(organizationId);
    res.json(profiles);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export function startSQLiteServer() {
  app.listen(PORT, () => {
    console.log(`SQLite API server running on port ${PORT}`);
  });
}

export default app;