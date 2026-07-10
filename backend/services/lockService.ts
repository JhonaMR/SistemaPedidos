class Mutex {
  private queue: Promise<void> = Promise.resolve();

  async acquire(): Promise<() => void> {
    let release: () => void = () => {};
    const nextPromise = new Promise<void>((resolve) => {
      release = resolve;
    });

    const currentQueue = this.queue;
    this.queue = this.queue.then(() => nextPromise);

    await currentQueue;
    return release;
  }
}

class FileLockManager {
  private locks = new Map<string, Mutex>();

  private getMutex(filePath: string): Mutex {
    let mutex = this.locks.get(filePath);
    if (!mutex) {
      mutex = new Mutex();
      this.locks.set(filePath, mutex);
    }
    return mutex;
  }

  /**
   * Ejecuta una función asíncrona de manera exclusiva para una ruta de archivo.
   * Garantiza que no haya lecturas/escrituras simultáneas en el mismo archivo.
   */
  async runExclusive<T>(filePath: string, callback: () => Promise<T>): Promise<T> {
    const mutex = this.getMutex(filePath);
    const release = await mutex.acquire();
    try {
      return await callback();
    } finally {
      release();
    }
  }
}

export const lockManager = new FileLockManager();
