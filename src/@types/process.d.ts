declare namespace NodeJS {
  interface Process extends EventEmitter {
    /**
     * @internal
     * @deprecated
     * It is recommended to use `process._getActiveHandles()` instead.
     */
    _getActiveRequests(): any[];

    /**
     * @internal
     */
    _getActiveHandles(): any[];
  }
}
