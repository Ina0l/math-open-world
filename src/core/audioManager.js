import { config } from "../constants.js"

/**
 * @typedef {Object} SoundConfig
 * @property {string} key - The identifier for the sound
 * @property {string} path - The path to the sound file
 * @property {boolean} [loop] - Whether the sound should loop
 */

export class AudioManager {
    constructor() {
        /** @type {Object<string, Object<string, HTMLAudioElement>>} */
        this.sounds = {}
        
        /** @type {HTMLAudioElement|null} */
        this.music = null
        
        /** @type {number} */
        this.musicVolume = 0.7
        
        /** @type {number} */
        this.soundVolume = 0.7
        
        /** @type {boolean} */
        this.muted = false
        
        /** @type {Set<HTMLAudioElement>} */
        this.activeSoundClones = new Set()
    }

    /**
     * Loads a sound into the manager
     * @param {string} scene - The scene/category for the sound
     * @param {string} key - The identifier for the sound
     * @param {string} path - The path to the sound file
     * @param {boolean} [loop=false] - Whether the sound should loop
     * @returns {HTMLAudioElement} The loaded audio element
     */
    loadSound(scene, key, path, loop = false) {
        if (!this.sounds[scene]) {
            this.sounds[scene] = {}
        }
        const audio = new Audio(config.AUDIO_DIR + path)
        audio.loop = loop
        audio.load()
        this.sounds[scene][key] = audio
        return audio
    }
    /**
     * Preloads multiple sounds
     * @param {string} scene - The scene/category for the sounds
     * @param {SoundConfig[]} soundList - Array of sound configurations
     */
    preloadSounds(scene, soundList) {
        soundList.forEach(sound => {
            this.loadSound(scene, sound.key, sound.path, sound.loop || false)
        })
    }

    /**
     * Plays a sound
     * @param {string} scene - The scene/category of the sound
     * @param {string} key - The identifier for the sound
     * @param {number} [volume=1] - Volume level (0 to 1)
     */
    playSound(scene, key, volume = 1) {
        if (this.muted) return
        const sound = this.sounds[scene]?.[key]
        if (!sound) {
            console.error(`Sound ${scene}:${key} not found`)
            return
        }
        const clone = sound.cloneNode()
        clone.volume = volume * this.soundVolume
        clone.play()
        this.activeSoundClones.add(clone)
        clone.addEventListener('ended', () => {
            this.activeSoundClones.delete(clone)
        })
    }

    /**
     * Plays music (automatically loops)
     * @param {string} scene - The scene/category of the music
     * @param {string} key - The identifier for the music
     * @param {number} [volume=1] - Volume level (0 to 1)
     */
    playMusic(scene, key, volume = 1) {
        if (this.music) {
            this.music.pause()
        }
        this.music = this.sounds[scene]?.[key]
        if (!this.music) {
            console.error(`Music ${scene}:${key} not found`)
            return
        }
        this.music.volume = volume * this.musicVolume
        this.music.currentTime = 0
        this.music.loop = true
        this.music.play()
    }

    /**
     * Sets the music volume
     * @param {number} volume - Volume level (0 to 1)
     */
    setMusicVolume(volume) {
        this.musicVolume = volume
        if (this.music) {
            this.music.volume = volume
        }
    }

    /**
     * Sets the sound effects volume
     * @param {number} volume - Volume level (0 to 1)
     */
    setSoundVolume(volume) {
        this.soundVolume = volume
    }

    /**
     * Toggles mute state
     * @returns {boolean} The new mute state
     */
    toggleMute() {
        this.muted = !this.muted
        if (this.music) {
            this.music.muted = this.muted
        }
        this.activeSoundClones.forEach(clone => {
            clone.muted = this.muted
        })
        return this.muted
    }

    /**
     * Stops the currently playing music
     */
    stopMusic() {
        if (this.music) {
            this.music.pause()
            this.music.currentTime = 0
        }
    }

    /**
     * Pauses all audio for a scene
     * @param {string} scene - The scene to pause audio for
     */
    pauseAll(scene) {
        if (this.music) {
            this.music.pause()
        }
        if (this.sounds[scene]) {
            Object.values(this.sounds[scene]).forEach(sound => sound.pause())
        }
        this.activeSoundClones.forEach(clone => clone.pause())
    }

    /**
     * Resumes all audio for a scene
     * @param {string} scene - The scene to resume audio for
     */
    resumeAll(scene) {
        if (this.music && this.music.paused && !this.muted) {
            this.music.play()
        }
        if (this.sounds[scene]) {
            Object.values(this.sounds[scene]).forEach(sound => {
                if (sound.paused && !this.muted) sound.play()
            })
        }
        this.activeSoundClones.forEach(clone => {
            if (clone.paused && !this.muted) clone.play()
        })
    }
}

