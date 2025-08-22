import { Game } from './src/core/game.js'

(async () => {
  const game = new Game()
  await game.run()  // Wait for game init

  // Hide loading screen and show canvas
  let loading_screen = document.getElementById('loading-screen')
  if(loading_screen == null) throw new Error('Couldn\'t find html element loading screen')
  loading_screen.style.display = 'none'
  game.canvas.style.display = 'block'
})()
