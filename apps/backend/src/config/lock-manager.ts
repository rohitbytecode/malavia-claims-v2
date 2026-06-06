interface LockEntry {
  claimId: string;
  userId: string;
  username: string;
  fullName: string;
  deviceName: string;
  socketId: string;
  acquiredAt: Date;
}

const locks = new Map<string, LockEntry>();

export const lockManager = {
  acquireLock(
    claimId: string,
    user: { id: string; username: string; fullName: string },
    deviceName: string,
    socketId: string
  ): { success: true } | { success: false; message: string } {
    const existing = locks.get(claimId);
    if (existing) {
      return {
        success: false,
        message: `This claim is already opened in ${existing.deviceName} by ${existing.fullName || existing.username}.`,
      };
    }
    locks.set(claimId, {
      claimId,
      userId: user.id,
      username: user.username,
      fullName: user.fullName,
      deviceName,
      socketId,
      acquiredAt: new Date(),
    });
    return { success: true };
  },

  releaseLockByClaim(claimId: string, socketId: string): void {
    const existing = locks.get(claimId);
    if (existing?.socketId === socketId) locks.delete(claimId);
  },

  releaseLocksBySocket(socketId: string): void {
    for (const [claimId, entry] of locks) {
      if (entry.socketId === socketId) locks.delete(claimId);
    }
  },
};
