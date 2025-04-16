export interface QueuePort {
  enqueue<T>(jobName: string, data: T): Promise<void>;
}
