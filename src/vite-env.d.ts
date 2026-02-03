/// <reference types="vite/client" />

// ONNX Runtime Web 类型声明
declare global {
  interface Window {
    ort: typeof import('onnxruntime-web')
  }
}

// 添加 ONNX Runtime 命名空间声明
declare namespace ort {
  const env: {
    wasm: {
      wasmPaths: string
      numThreads: number
      simd: boolean
      proxy: boolean
    }
    debug: boolean
    logLevel: string
    webgpu: {
      profilingMode: string
    }
  }

  class InferenceSession {
    static create(buffer: ArrayBuffer, options?: any): Promise<InferenceSession>
    run(inputs: Record<string, Tensor>): Promise<Record<string, Tensor>>
    inputNames: string[]
    outputNames: string[]
  }

  class Tensor {
    constructor(type: string, data: any, dims: number[])
    data: any
    dims: number[]
  }
}

// 添加 Navigator GPU API 类型扩展
interface Navigator {
  gpu?: {
    requestAdapter(): Promise<any>
  }
}

// 添加数组 at 方法的类型扩展（用于兼容旧版本浏览器）
interface Array<T> {
  at(index: number): T | undefined
}
