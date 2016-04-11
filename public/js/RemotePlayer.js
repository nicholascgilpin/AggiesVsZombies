/* jshint -W033 */
var RemotePlayer = function (index, game, player, startX, startY) {
  var x = startX
  var y = startY

  this.game = game
  this.player = player
  this.alive = true

  this.player = game.add.sprite(x, y, 'dude')

  this.player.animations.add('walk', [2, 3] , 10000, true);
  this.player.play('walk')
  this.player.anchor.setTo(0.5, 0.5)

  // saves id of client who plays this player
  this.player.name = index.toString()
  this.player.immovable = true
  this.player.angle = game.rnd.angle()

  // stores previous location to play animations
  this.lastPosition = { x: x, y: y }
}

RemotePlayer.prototype.update = function () {

  // rotates updated friendlies to make it look like they are turning
  if (this.player.x !== this.lastPosition.x || this.player.y !== this.lastPosition.y) {
    this.player.rotation = Math.PI + game.physics.arcade.angleToXY(this.player, this.lastPosition.x, this.lastPosition.y)
  }



  // tracks position
  this.lastPosition.x = this.player.x
  this.lastPosition.y = this.player.y
}

window.RemotePlayer = RemotePlayer
