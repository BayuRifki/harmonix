/// <reference types="vite/client" />

declare module '*?worker' {
  const WorkerClass: new () => Worker;
  export default WorkerClass;
}

declare module '*?worker&inline' {
  const WorkerClass: new () => Worker;
  export default WorkerClass;
}
