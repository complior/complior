(() => {
  const checkUserLimit = ({ currentUsers, pendingInvites, maxUsers }) => {
    const total = currentUsers + pendingInvites;
    if (maxUsers === -1) return { allowed: true, current: total, limit: -1 };
    if (maxUsers === 0) return { allowed: false, current: total, limit: 0 };
    return { allowed: total < maxUsers, current: total, limit: maxUsers };
  };

  const checkToolLimit = ({ currentTools, maxTools }) => {
    if (maxTools === -1) return { allowed: true, current: currentTools, limit: -1 };
    if (maxTools === 0) return { allowed: false, current: currentTools, limit: 0 };
    return { allowed: currentTools < maxTools, current: currentTools, limit: maxTools };
  };

  return { checkUserLimit, checkToolLimit };
})()
