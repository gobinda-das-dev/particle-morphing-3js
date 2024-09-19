import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js'
import GUI from 'lil-gui'
import gsap from 'gsap'
import particlesVertexShader from './shaders/particles/vertex.glsl'
import particlesFragmentShader from './shaders/particles/fragment.glsl'

/**
 * Base
 */
// Debug
const gui = new GUI({ width: 340 })
const debugObject = {}

// Canvas
const canvas = document.querySelector('canvas.webgl')

// Scene
const scene = new THREE.Scene()

// Loaders
const dracoLoader = new DRACOLoader()
dracoLoader.setDecoderPath('./draco/')
const gltfLoader = new GLTFLoader()
gltfLoader.setDRACOLoader(dracoLoader)

/**
 * Sizes
 */
const sizes = {
    width: window.innerWidth,
    height: window.innerHeight,
    pixelRatio: Math.min(window.devicePixelRatio, 2)
}

window.addEventListener('resize', () =>
{
    // Update sizes
    sizes.width = window.innerWidth
    sizes.height = window.innerHeight
    sizes.pixelRatio = Math.min(window.devicePixelRatio, 2)

    // Materials
    if(particles)
        particles.material.uniforms.uResolution.value.set(sizes.width * sizes.pixelRatio, sizes.height * sizes.pixelRatio)

    // Update camera
    camera.aspect = sizes.width / sizes.height
    camera.updateProjectionMatrix()

    // Update renderer
    renderer.setSize(sizes.width, sizes.height)
    renderer.setPixelRatio(sizes.pixelRatio)
})

/**
 * Camera
 */
// Base camera
const camera = new THREE.PerspectiveCamera(35, sizes.width / sizes.height, 0.1, 100)
camera.position.set(0, 0, 8 * 2)
scene.add(camera)

// Controls
const controls = new OrbitControls(camera, canvas)
controls.enableDamping = true

/**
 * Renderer
 */
const renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    antialias: true,
})

renderer.setSize(sizes.width, sizes.height)
renderer.setPixelRatio(sizes.pixelRatio)

debugObject.clearColor = '#160920'
gui.addColor(debugObject, 'clearColor').onChange(() => { renderer.setClearColor(debugObject.clearColor) })
renderer.setClearColor(debugObject.clearColor)

/**
 * Particles
 */

/* 
** Models
 */
let particles = null

gltfLoader.load('./models.glb', (gltf) => {
    particles = {}
    particles.index = 0

    // Positions
    const positions = gltf.scene.children.map(child => child.geometry.attributes.position);
    particles.maxCount = positions.reduce((max, position) => Math.max(max, position.count), 0);

    particles.position = []
    particles.size = []
    positions.forEach(position => {
        const originalArray = position.array
        const newArray = new Float32Array(particles.maxCount * 3)
        const size = new Float32Array(particles.maxCount)

        
        for (let i = 0; i < particles.maxCount; i++) {
            size[i] = Math.random()
            const i3 = i * 3;
            
            if(i3 < originalArray.length) {
                newArray[i3 + 0] = originalArray[i3 + 0]
                newArray[i3 + 1] = originalArray[i3 + 1]
                newArray[i3 + 2] = originalArray[i3 + 2]
            } else {
                const randomIndex = Math.floor(position.count * Math.random()) * 3
                
                newArray[i3 + 0] = originalArray[randomIndex + 0]
                newArray[i3 + 1] = originalArray[randomIndex + 1]
                newArray[i3 + 2] = originalArray[randomIndex + 2]
            }
        }

        particles.position.push(new THREE.Float32BufferAttribute(newArray, 3))
        particles.size.push(new THREE.Float32BufferAttribute(size, 1))
    });
    
    // Geometry
    particles.geometry = new THREE.BufferGeometry()
    particles.geometry.setAttribute('position', particles.position[particles.index])
    particles.geometry.setAttribute('aPositionTarget', particles.position[3])
    particles.geometry.setAttribute('aSize', particles.size[particles.index])
    particles.geometry.setIndex(null)
    
    // Material
    particles.colorA = '#ff7300'
    particles.colorB = '#0091ff'
    particles.material = new THREE.ShaderMaterial({
        vertexShader: particlesVertexShader,
        fragmentShader: particlesFragmentShader,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        uniforms:
        {
            uSize: new THREE.Uniform(0.4),
            uResolution: new THREE.Uniform(new THREE.Vector2(sizes.width * sizes.pixelRatio, sizes.height * sizes.pixelRatio)),
            uProgress: new THREE.Uniform(0),
            uColorA: new THREE.Uniform(new THREE.Color(particles.colorA)),
            uColorB: new THREE.Uniform(new THREE.Color(particles.colorB)),
            uTime: new THREE.Uniform(0)
        }
    })
    
    // Points
    particles.points = new THREE.Points(particles.geometry, particles.material)
    particles.points.frustumCulled = false
    scene.add(particles.points)

    // Methods
    particles.morph = (index) => {
        // Update attributes
        particles.geometry.attributes.position = particles.position[particles.index]
        particles.geometry.attributes.aPositionTarget = particles.position[index]

        gsap.fromTo(
            particles.material.uniforms.uProgress,
            { value: 0 }, 
            { value: 1, duration: 3, ease: 'none' }
        )

        // Save index
        particles.index = index
    }
    particles.morph0 = () => particles.morph(0)
    particles.morph1 = () => particles.morph(1)
    particles.morph2 = () => particles.morph(2)
    particles.morph3 = () => particles.morph(3)

    // Tweaks
    gui.addColor(particles, 'colorA').name('Color A').onChange(value => particles.material.uniforms.uColorA.value.set(value))
    gui.addColor(particles, 'colorB').name('Color B').onChange(value => particles.material.uniforms.uColorB.value.set(value))

    gui.add(particles.material.uniforms.uProgress, 'value', 0, 1, 0.0001).name('progress').listen()

    gui.add(particles, 'morph0')
    gui.add(particles, 'morph1')
    gui.add(particles, 'morph2')
    gui.add(particles, 'morph3')
})


/**
 * Animate
 */
gsap.ticker.add((time) => {
    // Update controls
    controls.update()

    // Update uTime
    if (particles) particles.material.uniforms.uTime.value = time

    // Render normal scene
    renderer.render(scene, camera)
})