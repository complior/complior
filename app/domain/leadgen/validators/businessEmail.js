(() => {
  const BLOCKED_DOMAINS = new Set([
    'gmail.com', 'googlemail.com',
    'yahoo.com', 'yahoo.co.uk', 'yahoo.fr', 'yahoo.de',
    'hotmail.com', 'hotmail.co.uk', 'hotmail.fr', 'hotmail.de',
    'outlook.com', 'outlook.fr', 'outlook.de',
    'live.com', 'live.co.uk', 'msn.com',
    'aol.com', 'icloud.com', 'me.com', 'mac.com',
    'mail.com', 'protonmail.com', 'proton.me', 'zoho.com',
    'yandex.com', 'yandex.ru', 'gmx.com', 'gmx.de',
    'web.de', 'mail.ru', 'inbox.com', 'fastmail.com',
    'tutanota.com', 'hey.com',
    // Disposable
    'tempmail.com', 'guerrillamail.com', 'mailinator.com',
    'yopmail.com', 'sharklasers.com', 'throwaway.email',
  ]);

  const isBusinessEmail = (email) => {
    if (!email || typeof email !== 'string') return false;
    const atIndex = email.lastIndexOf('@');
    if (atIndex < 1) return false;
    const emailDomain = email.slice(atIndex + 1).toLowerCase().trim();
    if (!emailDomain || !emailDomain.includes('.')) return false;
    return !BLOCKED_DOMAINS.has(emailDomain);
  };

  return { isBusinessEmail, BLOCKED_DOMAINS };
})()
