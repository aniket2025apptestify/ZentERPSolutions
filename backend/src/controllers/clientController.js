const { createAuditLog } = require('../services/auditLogService');
const clientService = require('../services/clientService');

/**
 * Get all clients for the tenant with optional filters
 * GET /api/clients?search=&company=&email=&phone=
 */
const getClients = async (req, res) => {
  try {
    const tenantId = req.tenantId;

    if (!tenantId) {
      return res.status(400).json({ message: 'Tenant ID is required' });
    }

    const filters = {
      search: req.query.search,
      company: req.query.company,
      email: req.query.email,
      phone: req.query.phone,
    };

    const clients = await clientService.getClients(tenantId, filters);
    res.json(clients);
  } catch (error) {
    console.error('Get clients error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Get single client by ID with stats
 * GET /api/clients/:id
 */
const getClientById = async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.tenantId;

    if (!tenantId) {
      return res.status(400).json({ message: 'Tenant ID is required' });
    }

    const client = await clientService.getClientById(tenantId, id);

    if (!client) {
      return res.status(404).json({ message: 'Client not found' });
    }

    res.json(client);
  } catch (error) {
    console.error('Get client by ID error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Create a new client
 * POST /api/clients
 */
const createClient = async (req, res) => {
  try {
    const tenantId = req.tenantId;

    if (!tenantId) {
      return res.status(400).json({ message: 'Tenant ID is required' });
    }

    const { name, companyName, email, phone, address, vatNumber } = req.body;

    // Validate required fields
    if (!name) {
      return res.status(400).json({ message: 'Name is required' });
    }

    const newClient = await clientService.createClient(tenantId, {
      name,
      companyName,
      email,
      phone,
      address,
      vatNumber,
    });

    // Create audit log
    await createAuditLog({
      tenantId: tenantId,
      userId: req.user.userId,
      action: 'CLIENT_CREATE',
      entityType: 'Client',
      entityId: newClient.id,
      newData: {
        name: newClient.name,
        companyName: newClient.companyName,
        email: newClient.email,
      },
    });

    res.status(201).json(newClient);
  } catch (error) {
    console.error('Create client error:', error);
    if (error.message.includes('required') || error.message.includes('Invalid')) {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Update client
 * PUT /api/clients/:id
 */
const updateClient = async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.tenantId;

    if (!tenantId) {
      return res.status(400).json({ message: 'Tenant ID is required' });
    }

    const { name, companyName, email, phone, address, vatNumber } = req.body;

    // Get existing client for audit log
    const existingClient = await clientService.getClientById(tenantId, id);
    if (!existingClient) {
      return res.status(404).json({ message: 'Client not found' });
    }

    const oldData = {
      name: existingClient.name,
      companyName: existingClient.companyName,
      email: existingClient.email,
      phone: existingClient.phone,
      address: existingClient.address,
      vatNumber: existingClient.vatNumber,
    };

    const updatedClient = await clientService.updateClient(tenantId, id, {
      name,
      companyName,
      email,
      phone,
      address,
      vatNumber,
    });

    // Create audit log
    await createAuditLog({
      tenantId: tenantId,
      userId: req.user.userId,
      action: 'CLIENT_UPDATE',
      entityType: 'Client',
      entityId: id,
      oldData: oldData,
      newData: {
        name: updatedClient.name,
        companyName: updatedClient.companyName,
        email: updatedClient.email,
        phone: updatedClient.phone,
        address: updatedClient.address,
        vatNumber: updatedClient.vatNumber,
      },
    });

    res.json(updatedClient);
  } catch (error) {
    console.error('Update client error:', error);
    if (error.message === 'Client not found') {
      return res.status(404).json({ message: error.message });
    }
    if (error.message.includes('required') || error.message.includes('Invalid')) {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Delete client (soft delete)
 * DELETE /api/clients/:id
 */
const deleteClient = async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.tenantId;

    if (!tenantId) {
      return res.status(400).json({ message: 'Tenant ID is required' });
    }

    await clientService.deleteClient(tenantId, id);

    // Create audit log
    await createAuditLog({
      tenantId: tenantId,
      userId: req.user.userId,
      action: 'CLIENT_DELETE',
      entityType: 'Client',
      entityId: id,
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Delete client error:', error);
    if (error.message === 'Client not found') {
      return res.status(404).json({ message: error.message });
    }
    res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = {
  getClients,
  getClientById,
  createClient,
  updateClient,
  deleteClient,
};
