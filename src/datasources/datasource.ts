export interface DataSource {

  start(): Promise<void>;
  stop(): Promise<void>;
  query(queryData: {text: string, values?: any[]}): Promise<any>;

}