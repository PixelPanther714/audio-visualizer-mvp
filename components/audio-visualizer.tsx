"use client"

import { useEffect, useRef } from "react"
import * as THREE from "three"
import { OrbitControls } from "three/addons/controls/OrbitControls.js"

interface AudioVisualizerProps {
  audioUrl: string
  isPlaying: boolean
  formula: string
  onSimilarityUpdate: (similarity: number) => void
}

export default function AudioVisualizer({ audioUrl, isPlaying, formula, onSimilarityUpdate }: AudioVisualizerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const barsRef = useRef<THREE.Mesh[]>([])
  const originalPositionsRef = useRef<{ x: number; z: number }[]>([])
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const dataArrayRef = useRef<Uint8Array | null>(null)
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const controlsRef = useRef<OrbitControls | null>(null)

  // Initialize Three.js scene
  useEffect(() => {
    console.log("[v0] Initializing Three.js scene")
    if (!containerRef.current) return

    // Scene setup
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x000000)
    sceneRef.current = scene

    // Camera setup
    const camera = new THREE.PerspectiveCamera(
      75,
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.1,
      1000,
    )
    camera.position.set(0, 15, 30)
    camera.lookAt(0, 0, 0)
    cameraRef.current = camera

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight)
    renderer.setPixelRatio(window.devicePixelRatio)
    containerRef.current.appendChild(renderer.domElement)
    rendererRef.current = renderer

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.05
    controlsRef.current = controls

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5)
    scene.add(ambientLight)

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8)
    directionalLight.position.set(0, 10, 10)
    scene.add(directionalLight)

    const gridSize = 8
    const barCount = gridSize * gridSize
    const spacing = 1.5
    const bars: THREE.Mesh[] = []
    const positions: { x: number; z: number }[] = []

    for (let i = 0; i < barCount; i++) {
      const row = Math.floor(i / gridSize)
      const col = i % gridSize

      const geometry = new THREE.BoxGeometry(1, 1, 1)
      const material = new THREE.MeshPhongMaterial({
        color: new THREE.Color().setHSL(i / barCount, 0.8, 0.5),
        emissive: new THREE.Color().setHSL(i / barCount, 0.6, 0.3),
        shininess: 30,
      })

      const bar = new THREE.Mesh(geometry, material)
      const x = (col - gridSize / 2) * spacing
      const z = (row - gridSize / 2) * spacing

      bar.position.x = x
      bar.position.z = z
      bar.position.y = 0.5
      bar.scale.y = 0.1

      scene.add(bar)
      bars.push(bar)
      positions.push({ x, z })
    }

    barsRef.current = bars
    originalPositionsRef.current = positions
    console.log("[v0] Created", bars.length, "bars in", gridSize, "x", gridSize, "grid")

    // Grid helper
    const gridHelper = new THREE.GridHelper(gridSize * spacing, gridSize, 0x333333, 0x111111)
    scene.add(gridHelper)

    // Handle resize
    const handleResize = () => {
      if (!containerRef.current || !cameraRef.current || !rendererRef.current) return

      const width = containerRef.current.clientWidth
      const height = containerRef.current.clientHeight

      cameraRef.current.aspect = width / height
      cameraRef.current.updateProjectionMatrix()
      rendererRef.current.setSize(width, height)
    }

    window.addEventListener("resize", handleResize)

    // Animation loop
    const animate = () => {
      animationFrameRef.current = requestAnimationFrame(animate)

      if (controlsRef.current) {
        controlsRef.current.update()
      }

      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current)
      }
    }
    animate()

    // Cleanup
    return () => {
      console.log("[v0] Cleaning up Three.js scene")
      window.removeEventListener("resize", handleResize)
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
      if (
        rendererRef.current &&
        containerRef.current &&
        containerRef.current.contains(rendererRef.current.domElement)
      ) {
        containerRef.current.removeChild(rendererRef.current.domElement)
        rendererRef.current.dispose()
      }
      bars.forEach((bar) => {
        bar.geometry.dispose()
        if (bar.material instanceof THREE.Material) {
          bar.material.dispose()
        }
      })
    }
  }, [])

  // Initialize Web Audio API
  useEffect(() => {
    console.log("[v0] Setting up Web Audio API, audioUrl:", audioUrl ? "present" : "missing")
    if (!audioUrl) return

    const audio = document.querySelector("audio")
    if (!audio) {
      console.log("[v0] Audio element not found")
      return
    }

    // Create audio context and analyser
    if (!audioContextRef.current) {
      console.log("[v0] Creating AudioContext")
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      audioContextRef.current = audioContext

      const analyser = audioContext.createAnalyser()
      analyser.fftSize = 128
      analyserRef.current = analyser

      const bufferLength = analyser.frequencyBinCount
      const dataArray = new Uint8Array(bufferLength)
      dataArrayRef.current = dataArray
      console.log("[v0] Created analyser with", bufferLength, "frequency bins")

      // Connect audio element to analyser
      if (!sourceRef.current) {
        try {
          const source = audioContext.createMediaElementSource(audio)
          source.connect(analyser)
          analyser.connect(audioContext.destination)
          sourceRef.current = source
          console.log("[v0] Connected audio source to analyser")
        } catch (error) {
          console.log("[v0] Error connecting audio:", error)
        }
      }
    }

    return () => {
      // Keep audio context alive for reuse
    }
  }, [audioUrl])

  // Parse and evaluate formula
  const evaluateFormula = (x: number, formulaStr: string): number => {
    try {
      // Create a safe evaluation context
      const sin = Math.sin
      const cos = Math.cos
      const tan = Math.tan
      const sqrt = Math.sqrt
      const abs = Math.abs
      const pow = Math.pow
      const exp = Math.exp
      const log = Math.log

      // Use x directly as the index (0-63)
      // eslint-disable-next-line no-eval
      const result = eval(formulaStr.replace(/x/g, `(${x})`))
      return isNaN(result) ? 0 : result
    } catch {
      return 0
    }
  }

  // Calculate similarity between two arrays using correlation coefficient
  const calculateSimilarity = (arr1: number[], arr2: number[]): number => {
    const n = Math.min(arr1.length, arr2.length)
    if (n === 0) return 0

    const mean1 = arr1.slice(0, n).reduce((a, b) => a + b, 0) / n
    const mean2 = arr2.slice(0, n).reduce((a, b) => a + b, 0) / n

    let numerator = 0
    let sum1 = 0
    let sum2 = 0

    for (let i = 0; i < n; i++) {
      const diff1 = arr1[i] - mean1
      const diff2 = arr2[i] - mean2
      numerator += diff1 * diff2
      sum1 += diff1 * diff1
      sum2 += diff2 * diff2
    }

    const denominator = Math.sqrt(sum1 * sum2)

    if (denominator === 0) return 0

    const correlation = numerator / denominator
    // Convert correlation (-1 to 1) to percentage (0 to 100)
    return ((correlation + 1) / 2) * 100
  }

  // Update visualization
  useEffect(() => {
    if (!analyserRef.current || !dataArrayRef.current) {
      return
    }

    let frameId: number
    let frameCount = 0

    const updateVisualization = () => {
      if (!analyserRef.current || !dataArrayRef.current || !barsRef.current.length) return

      frameCount++

      // Get frequency data
      analyserRef.current.getByteFrequencyData(dataArrayRef.current)

      const bars = barsRef.current
      const dataArray = dataArrayRef.current
      const originalPositions = originalPositionsRef.current

      // Store original and calculated values for similarity
      const originalValues: number[] = []
      const calculatedValues: number[] = []

      // Update each bar
      bars.forEach((bar, i) => {
        if (i < dataArray.length) {
          // Original frequency value (normalized)
          const frequency = isPlaying ? dataArray[i] / 255 : (dataArray[i] / 255) * 0.3

          const heightY = frequency * 15 + 0.5

          const heightZ = evaluateFormula(i, formula)

          // Update bar scale on Y axis
          bar.scale.y = heightY
          bar.position.y = bar.scale.y / 2

          if (originalPositions[i]) {
            bar.position.z = originalPositions[i].z + heightZ * 0.3
          }

          const hue = i / bars.length
          const material = bar.material as THREE.MeshPhongMaterial
          material.color.setHSL(hue, 0.9, 0.4 + frequency * 0.4)
          material.emissive.setHSL(hue, 0.8, frequency * 0.4)

          originalValues.push(frequency)
          calculatedValues.push(Math.abs(heightZ))
        }
      })

      // Calculate similarity every 10 frames to reduce overhead
      if (frameCount % 10 === 0 && isPlaying) {
        const similarity = calculateSimilarity(originalValues, calculatedValues)
        onSimilarityUpdate(similarity)
      }

      frameId = requestAnimationFrame(updateVisualization)
    }

    updateVisualization()

    return () => {
      if (frameId) {
        cancelAnimationFrame(frameId)
      }
    }
  }, [isPlaying, formula, onSimilarityUpdate])

  // Resume audio context on interaction
  useEffect(() => {
    if (isPlaying && audioContextRef.current?.state === "suspended") {
      console.log("[v0] Resuming suspended AudioContext")
      audioContextRef.current.resume()
    }
  }, [isPlaying])

  return <div ref={containerRef} className="w-full h-200" />
}
