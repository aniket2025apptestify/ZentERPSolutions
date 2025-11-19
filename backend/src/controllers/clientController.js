const prisma = require('../config/prisma');

/**
 * Get all clients for the tenant
 * GET /api/clients
 */
const getClients = async (req, res) => {
  try {
    const tenantId = req.tenantId;

    if (!tenantId) {
      return res.status(400).json({ message: 'Tenant ID is required' });
    }

    const clients = await prisma.client.findMany({
      where: {
        tenantId: tenantId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.json(clients);
  } catch (error) {
    console.error('Get clients error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Get single client by ID
 * GET /api/clients/:id
 */
const getClientById = async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.tenantId;

    const client = await prisma.client.findFirst({
      where: {
        id: id,
        tenantId: tenantId,
      },
    });

    if (!client) {
      return res.status(404).json({ message: 'Client not found' });
    }

    res.json(client);
  } catch (error) {
    console.error('Get client by ID error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = {
  getClients,
  getClientById,
};

