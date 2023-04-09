import { SuperVideoElement } from 'super-media-element';
import Hls from 'hls.js/dist/hls.mjs';

class HlsVideoElement extends SuperVideoElement {

  // Prevent forwarding src to native video element.
  static skipAttributes = ['src'];

  // No load promise needed because hls.js is sync.
  loadComplete = null;

  #destroy() {
    if (this.api) {
      this.api.detachMedia();
      this.api.destroy();
      this.api = null;
    }
  }

  async load() {
    this.#destroy();

    if (!this.src) {
      return;
    }

    if (Hls.isSupported()) {
      this.api = new Hls({
        // Mimic the media element with an Infinity duration
        // for live streams
        liveDurationInfinity: true
      });

      switch (this.nativeEl.preload) {
        case 'none': {
          // when preload is none, load the source on first play
          const loadSourceOnPlay = () => this.api.loadSource(this.src);
          this.nativeEl.addEventListener('play', loadSourceOnPlay, {
            once: true,
          });
          this.api.on(Hls.Events.DESTROYING, () => {
            this.nativeEl.removeEventListener('play', loadSourceOnPlay);
          });
          break;
        }
        case 'metadata': {
          const originalLength = this.api.config.maxBufferLength;
          const originalSize = this.api.config.maxBufferSize;
          // load the least amount of data possible
          this.api.config.maxBufferLength = 1;
          this.api.config.maxBufferSize = 1;
          // and once a user has player, allow for it to load data as normal
          const increaseBufferOnPlay = () => {
            this.api.config.maxBufferLength = originalLength;
            this.api.config.maxBufferSize = originalSize;
          };
          this.nativeEl.addEventListener('play', increaseBufferOnPlay, {
            once: true,
          });
          this.api.on(Hls.Events.DESTROYING, () => {
            this.nativeEl.removeEventListener('play', increaseBufferOnPlay);
          });
          this.api.loadSource(this.src);
          break;
        }
        default:
          // load source immediately for any other preload value
          this.api.loadSource(this.src);
      }

      this.api.attachMedia(this.nativeEl);

    } else if (this.nativeEl.canPlayType('application/vnd.apple.mpegurl')) {

      this.nativeEl.src = this.src;
    }
  }
}

if (!globalThis.customElements.get('hls-video')) {
  globalThis.customElements.define('hls-video', HlsVideoElement);
}

export default HlsVideoElement;