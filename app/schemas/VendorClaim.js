({
  Entity: {},

  // Which registry tool is being claimed
  toolSlug: { type: 'string', length: { max: 100 } },

  // Vendor contact
  vendorEmail: { type: 'string', length: { max: 255 } },
  vendorDomain: { type: 'string', length: { max: 255 } },

  // Verification
  verificationMethod: {
    enum: ['dns_txt', 'meta_tag', 'well_known'],
    required: false,
  },
  verificationToken: { type: 'string', length: { max: 255 }, required: false },
  tokenExpiresAt: { type: 'datetime', required: false },

  // Claim status
  status: {
    enum: ['pending', 'verification_sent', 'verified', 'approved', 'rejected'],
    default: 'pending',
  },

  // Timestamps
  verifiedAt: { type: 'datetime', required: false },
  reviewedBy: { type: 'string', length: { max: 255 }, required: false },
  reviewedAt: { type: 'datetime', required: false },
  rejectionReason: { type: 'string', required: false },

  // Vendor-submitted data (after approval)
  submittedData: { type: 'json', required: false },
});
