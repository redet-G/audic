/// <reference types="node"/>
import vlc from "@richienb/vlc"
import ow from "ow"
import { AsyncReturnType } from "type-fest" // eslint-disable-line import/no-unresolved, node/no-missing-import, @typescript-eslint/no-unused-vars

class Audic {
	/**
	Whether the audio is currently playing.
	*/
	public playing = false

	/**
	The duration of the audio.
	*/
	public duration: number

	private _src: string

	private _volume = 1

	private _currentTime = 0

	private _vlc: AsyncReturnType<typeof vlc>

	private readonly _setup: Promise<void>

	private _timeUpdater: NodeJS.Timeout

	constructor(src?: string) {
		ow(src, ow.optional.string)

		this._src = src

		this._setup = (async () => {
			this._vlc = await vlc()
			if (src) {
				await this._vlc.command("in_enqueue", {
					input: src
				})
			}

			this._timeUpdater = setInterval(async () => {
				const { length: duration, time: currentTime } = await this._vlc.info()
				this.duration = duration
				this._currentTime = currentTime
				if (duration === 0 && currentTime === 0) {
					this.playing = false
				}
			}, 1000)
		})()
	}

	/**
	Start playing the audio.
	*/
	public async play(looped) {
		if (!this.playing) {
			this.playing = true
			await this._setup
			if (looped) {
				await this._vlc.command("pl_loop")
			}
			await this._vlc.command("pl_pause", {
				id: 0
			})
		}
	}

	/**
	Pause the audio playback.
	*/
	public async pause() {
		if (this.playing) {
			this.playing = false
			await this._setup
			await this._vlc.command("pl_pause", {
				id: 0
			})
		}
	}

	/**
	The volume of the audio.
	*/
	public get volume() {
		return this._volume
	}

	/**
	The volume of the audio.
	*/
	public set volume(value) {
		ow(value, ow.number.inRange(0, 1))
		void (async () => {
			await this._setup
			this._volume = value
			await this._vlc.command("volume", { val: Math.round(value * 256) })
		})()
	}

	/**
	The source uri of the audio.
	*/
	public get src() {
		return this._src
	}

	/**
	The source uri of the audio.
	*/
	public set src(value) {
		ow(value, ow.string)

		this._src = value

		void (async () => {
			await this._setup
			await this._vlc.command("pl_empty")
			await this._vlc.command("in_enqueue", {
				input: value
			})
			this.playing = false
		})()
	}

	/**
	The current playing time of the audio.
	*/
	public get currentTime() {
		return this._currentTime
	}

	/**
	The current playing time of the audio.
	*/
	public set currentTime(value) {
		ow(value, ow.number.integer.greaterThanOrEqual(0))

		void (async () => {
			await this._setup
			await this._vlc.command("seek", { val: value })
		})()
	}

	/**
	Destroy the player instance.
	*/
	public destroy() {
		clearInterval(this._timeUpdater)
		this._vlc.kill()
	}
}

export = Audic
