/* eslint-disable */
import localforage from 'localforage'

export type modelType = 'inpaint' | 'superResolution'

localforage.config({
  name: 'modelCache',
})

export async function saveModel(modelType: modelType, modelBlob: ArrayBuffer) {
  await localforage.setItem(getModel(modelType).name, modelBlob)
}

function getModel(modelType: modelType) {
  if (modelType === 'inpaint') {
    const modelList = [
      {
        name: 'model',
        url: 'https://huggingface.co/lxfater/inpaint-web/resolve/main/migan.onnx',
        backupUrl: '',
      },
      {
        name: 'model-perf',
        url: 'https://huggingface.co/andraniksargsyan/migan/resolve/main/migan.onnx',
        backupUrl: '',
      },
      {
        name: 'migan-pipeline-v2',
        url: 'https://huggingface.co/andraniksargsyan/migan/resolve/main/migan_pipeline_v2.onnx',
        backupUrl:
          'https://worker-share-proxy-01f5.lxfater.workers.dev/andraniksargsyan/migan/resolve/main/migan_pipeline_v2.onnx',
      },
    ]
    const currentModel = modelList[2]
    return currentModel
  }
  if (modelType === 'superResolution') {
    const modelList = [
      {
        name: 'realesrgan-x4',
        url: 'https://huggingface.co/lxfater/inpaint-web/resolve/main/realesrgan-x4.onnx',
        backupUrl:
          'https://worker-share-proxy-01f5.lxfater.workers.dev/lxfater/inpaint-web/resolve/main/realesrgan-x4.onnx',
      },
    ]
    const currentModel = modelList[0]
    return currentModel
  }
  throw new Error('wrong modelType')
}

export async function loadModel(modelType: modelType): Promise<ArrayBuffer> {
  const model = (await localforage.getItem(
    getModel(modelType).name
  )) as ArrayBuffer
  return model
}

export async function modelExists(modelType: modelType) {
  const model = await loadModel(modelType)
  return model !== null && model !== undefined
}

export async function loadModelFromLocalFile(
  modelType: modelType
): Promise<ArrayBuffer | null> {
  try {
    const model = getModel(modelType)
    const fileName =
      model.name === 'migan-pipeline-v2'
        ? 'migan_pipeline_v2.onnx'
        : `${model.name}.onnx`

    // eslint-disable-next-line no-console
    console.log(`Attempting to load model from local: ${fileName}`)
    const response = await fetch(`/models/${fileName}`)

    if (!response.ok) {
      // eslint-disable-next-line no-console
      console.log(`Local model file not found: ${fileName}`)
      return null
    }

    const arrayBuffer = await response.arrayBuffer()
    // eslint-disable-next-line no-console
    console.log(
      `Successfully loaded local model: ${fileName}, size: ${arrayBuffer.byteLength} bytes`
    )
    await saveModel(modelType, arrayBuffer)
    return arrayBuffer
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to load local model:', error)
    return null
  }
}

export async function ensureModel(modelType: modelType) {
  // First check IndexedDB cache
  if (await modelExists(modelType)) {
    // eslint-disable-next-line no-console
    console.log('Loading model from cache')
    return loadModel(modelType)
  }

  // Second try to load from local file
  // eslint-disable-next-line no-console
  console.log('Attempting to load model from local file')
  const localModel = await loadModelFromLocalFile(modelType)
  if (localModel) {
    return localModel
  }

  // Finally fall back to network download
  // eslint-disable-next-line no-console
  console.log('Downloading model from network')
  const model = getModel(modelType)
  const response = await fetch(model.url)
  const arrayBuffer = await response.arrayBuffer()
  await saveModel(modelType, arrayBuffer)
  return arrayBuffer
}

export async function downloadModel(
  modelType: modelType,
  setDownloadProgress: (arg0: number) => void
) {
  if (await modelExists(modelType)) {
    return
  }

  async function downloadFromUrl(url: string) {
    // eslint-disable-next-line no-console
    console.log('start download from', url)
    setDownloadProgress(0)
    const response = await fetch(url)
    const fullSize = response.headers.get('content-length')
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const reader = response.body!.getReader()
    const total: Uint8Array[] = []
    let downloaded = 0

    while (true) {
      const { done, value } = await reader.read()

      if (done) {
        break
      }

      downloaded += value?.length || 0

      if (value) {
        total.push(value)
      }

      setDownloadProgress((downloaded / Number(fullSize)) * 100)
    }

    const buffer = new Uint8Array(downloaded)
    let offset = 0
    for (const chunk of total) {
      buffer.set(chunk, offset)
      offset += chunk.length
    }

    await saveModel(modelType, buffer.buffer)
    setDownloadProgress(100)
  }

  const model = getModel(modelType)
  try {
    await downloadFromUrl(model.url)
  } catch (e) {
    if (model.backupUrl) {
      try {
        await downloadFromUrl(model.backupUrl)
      } catch (r) {
        // eslint-disable-next-line no-alert
        alert(`Failed to download the backup model: ${r}`)
      }
    }
    // eslint-disable-next-line no-alert
    alert(`Failed to download the model, network problem: ${e}`)
  }
}
