const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const OWNER_PASSWORD = process.env.OWNER_PASSWORD || 'pooja123';

const requireAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Unauthorized. Owner password required.' });
  }

  const token = authHeader.split(' ')[1];
  
  if (token !== OWNER_PASSWORD) {
    return res.status(401).json({ success: false, message: 'Unauthorized. Invalid owner password.' });
  }

  next();
};

const checkAuthOptional = (req, res, next) => {
  const authHeader = req.headers.authorization;
  req.isOwner = false;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    if (token === OWNER_PASSWORD) {
      req.isOwner = true;
    }
  }
  
  next();
};

module.exports = { requireAuth, checkAuthOptional };
