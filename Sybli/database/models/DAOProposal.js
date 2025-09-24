const mongoose = require('mongoose');
const { DAOSchema } = require('../schemas');

const DAOProposal = mongoose.model('DAOProposal', DAOSchema);

module.exports = DAOProposal;
