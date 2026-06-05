export class Particle {
  x: number
  y: number
  vx: number
  vy: number
  radius: number
  alpha: number
  color: string

  constructor(x: number, y: number, color: string) {
    this.x = x
    this.y = y
    this.vx = (Math.random() - 0.5) * 6
    this.vy = (Math.random() - 0.5) * 6 - 2
    this.radius = Math.random() * 5 + 2
    this.alpha = 1
    this.color = color
  }

  update() {
    this.x += this.vx
    this.y += this.vy
    this.vy += 0.15
    this.alpha -= 0.025
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.save()
    ctx.globalAlpha = this.alpha
    ctx.fillStyle = this.color
    ctx.beginPath()
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }
}
