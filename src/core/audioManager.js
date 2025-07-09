//@ts-check
import { config, audios } from '../constants.js'
import { clamp } from '../utils.js'

class AudioManager {
	constructor(soundVolume = 0.7, musicVolume = 0.7, muted = false) {
		this.soundVolume = soundVolume
		this.musicVolume = musicVolume
		this.muted = muted

		//@ts-ignore
		this.audioContext = new (window.AudioContext || window.webkitAudioContext)()
		/**@type {Map<string, Map<string, {buffer: AudioBuffer, loop: boolean}>>} */
		this.sounds = new Map()
		this.activeSounds = new Map()
		this.decodePromises = new Map()
		this.music = null

		document.addEventListener('click', () => this.unlockAudio())
	}

	/**
	 * 
	 * @param {string} scene_name 
	 * @returns {Map<string, {buffer: AudioBuffer, loop: boolean}>}
	 */
	getOrCreateScene(scene_name) {
		if (!this.sounds.has(scene_name)) {
			this.sounds.set(scene_name, new Map())
		}
		let scene = this.sounds.get(scene_name)
		if(scene) return scene
		else throw new Error('Somehow the scene wasn\'t found')
	}

	/**
	 * 
	 * @param {string} scene 
	 * @param {string} key 
	 * @param {ArrayBuffer} arrayBuffer 
	 * @returns {Promise<AudioBuffer?>}
	 */
	decodeAudioData(scene, key, arrayBuffer) {
		const cacheKey = `${scene}:${key}`

		if (this.decodePromises.has(cacheKey)) {
			return this.decodePromises.get(cacheKey)
		}

		const promise = this.audioContext.decodeAudioData(arrayBuffer)
			.then(decodedBuffer => {
				this.decodePromises.delete(cacheKey)
				return decodedBuffer
			})
			.catch(err => {
				console.error('Error decoding audio ' + cacheKey, err)
				this.decodePromises.delete(cacheKey)
				return null
			})

		this.decodePromises.set(cacheKey, promise)
		return promise
	}

	/**
	 * 
	 * @param {AudioBuffer} buffer 
	 * @param {number} volume 
	 * @param {boolean} loop 
	 * @returns {{source: AudioBufferSourceNode, gainNode: GainNode}?}
	 */
	playBuffer(buffer, volume = 1, loop = false) {
		if (!this.audioContext || this.muted) return null

		var source = this.audioContext.createBufferSource()
		var gainNode = this.audioContext.createGain()

		source.buffer = buffer
		source.loop = loop
		source.connect(gainNode)
		gainNode.connect(this.audioContext.destination)
		gainNode.gain.value = Math.pow(volume * this.soundVolume, 3)

		source.start()

		return { source: source, gainNode: gainNode }
	}

	/**
	 * 
	 * @param {string} scene_name 
	 * @param {string} key 
	 * @param {string} src 
	 * @param {boolean} loop
	 * @returns {Promise<AudioBuffer?>}
	 */
	async loadSound(scene_name, key, src, loop) {
		var scene = this.getOrCreateScene(scene_name)
		try {
			var response = await fetch(config.AUDIO_DIR + src)
			var arrayBuffer = await response.arrayBuffer()
			var audioBuffer = await this.decodeAudioData(scene_name, key, arrayBuffer)
			if (audioBuffer) {
				scene.set(key, { buffer: audioBuffer, loop: loop })
			}
			return audioBuffer
		} catch (e) {
			console.error('Error loading sound ' + scene_name + ':' + key, e)
			return null
		}
	}

	/**
	 * 
	 * @param {string} scene_name 
	 * @param {Array<{src: string, key: string, loop?: boolean}>} soundList 
	 */
	async preloadSounds(scene_name, soundList) {
		await Promise.all(soundList.map(sound => {
			return this.loadSound(scene_name, sound.key, sound.src, sound.loop || false)
		}))
	}

	/**
	 * 
	 * @param {string} scene_name 
	 * @param {string} key 
	 * @param {number} [volume=1] 
	 * @returns {string?}
	 */
	playSound(scene_name, key, volume = 1) {
		var scene = this.sounds.get(scene_name)
		if (!scene) {
			console.error('Scene not found: ' + scene_name)
			return null
		}

		var sound = scene.get(key)
		if (!sound) {
			console.error('Sound not found: ' + key + ' in scene ' + scene_name)
			return null
		}

		var instanceId = scene_name + ':' + key + ':' + performance.now()
		var audioNodes = this.playBuffer(sound.buffer, volume, sound.loop)

		if (audioNodes) {
			this.activeSounds.set(instanceId, {
				source: audioNodes.source,
				gainNode: audioNodes.gainNode,
				scene_name,
				key,
				ended: false
			})

			audioNodes.source.addEventListener('ended', () => {
				var instance = this.activeSounds.get(instanceId)
				if (instance) {
					instance.ended = true
					this.activeSounds.delete(instanceId)
				}
			})

			return instanceId
		}

		return null
	}

	/**
	 * 
	 * @param {string} scene 
	 * @param {string} key 
	 * @returns {boolean}
	 */
	isSoundPlaying(scene, key) {
		for (var [, instance] of this.activeSounds) {
			if (instance.scene === scene && instance.key === key && !instance.ended) {
				return true
			}
		}
		return false
	}

	/**
	 * 
	 * @param {string} scene 
	 * @param {string} key 
	 * @param {number} durationMs 
	 * @param {number} volume 
	 * @returns 
	 */
	playSoundForDuration(scene, key, durationMs, volume = 1) {
		let instanceId = this.playSound(scene, key, volume)
		if (!instanceId) return
		setTimeout(() => {
			this.endSoundInstance(instanceId)
		}, durationMs)
	}

	/**
	 * 
	 * @param {string} instanceId 
	 */
	endSoundInstance(instanceId) {
		var instance = this.activeSounds.get(instanceId)
		if (instance && !instance.ended) {
			instance.source.stop()
			this.activeSounds.delete(instanceId)
		}
	}

	/**
	 * 
	 * @param {string} scene 
	 * @param {string} key 
	 */
	endSound(scene, key) {
		for (var [id, instance] of this.activeSounds) {
			if (instance.scene === scene && instance.key === key) {
				instance.source.stop()
				this.activeSounds.delete(id)
			}
		}
	}
	
	/**
	 * 
	 * @param {string} scene 
	 * @param {string} key 
	 * @param {number} [volume=1] 
	 * @returns 
	 */
	async playMusic(scene, key, volume = 1) {
		if (this.music) {
			this.music.pause()
			this.music = null
		}

		var sceneMap = this.sounds.get(scene)
		if (!sceneMap) {
			console.error('Scene not found: ' + scene)
			return
		}

		var sound = sceneMap.get(key)
		if (!sound) {
			console.error('Music not found: ' + key + ' in scene ' + scene)
			return
		}

		// I suppose your still working on it so I'll pass it for now
		//@ts-ignore
		var blob = new Blob([sound.buffer])
		this.music = new Audio()
		this.music.src = URL.createObjectURL(blob)
		this.music.volume = volume * this.musicVolume
		this.music.loop = true
		this.music.muted = this.muted

		this.music.play().catch(e => {
			console.error('Music playback failed', e)
		})
	}

	/**
	 * 
	 * @param {number} volume 
	 */
	setMusicVolume(volume) {
		volume = clamp(volume, 0, 1)

		this.musicVolume = volume
		if (this.music) {
			this.music.volume = volume
		}
	}

	/**
	 * 
	 * @param {number} volume 
	 */
	setSoundVolume(volume) {
		volume = clamp(volume, 0, 1)

		this.musicVolume = volume
		if (this.music) {
			this.music.volume = volume
		}
	}

	/**
	 * 
	 * @returns {boolean}
	 */
	toggleMute() {
		this.muted = !this.muted
		if (this.music) {
			this.music.muted = this.muted
		}

		if (this.audioContext) {
			this.audioContext.suspend().then(() => {
				if (!this.muted) {
					this.audioContext.resume()
				}
			})
		}

		return this.muted
	}

	stopMusic() {
		if (this.music) {
			this.music.pause()
			this.music.currentTime = 0
			this.music = null
		}
	}

	pauseAll() {
		if (this.music) {
			this.music.pause()
		}
		if (this.audioContext) {
			this.audioContext.suspend()
		}
	}

	resumeAll() {
		if (!this.muted) {
			if (this.music && this.music.paused) {
				this.music.play().catch(e => {
					console.error('Music resume failed', e)
				})
			}
			if (this.audioContext) {
				this.audioContext.resume()
			}
		}
	}

	async loadAudios() {
		const scenes = Object.entries(audios)
		for (var i = 0; i < scenes.length; i++) {
			const [scene, soundList] = scenes[i]
			await this.preloadSounds(scene, soundList)
		}
	}

	destroy() {
		this.stopMusic()
		for (var instance of this.activeSounds.values()) {
			instance.source.stop()
		}
		this.activeSounds.clear()
		if (this.audioContext) {
			this.audioContext.close()
		}
	}

	// browser is annoying
	unlockAudio() {
		if (this.audioContext && this.audioContext.state === 'suspended') {
			this.audioContext.resume()
		}
	}
}

export { AudioManager }
