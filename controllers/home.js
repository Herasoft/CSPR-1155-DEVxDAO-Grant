/**
 * GET /
 * Home page.
 */
exports.index = (req, res) => {

  // if logged in
//  res.sendFile(path.resolve(__dirname, 'public/game/', 'game.html'));

  res.render('home', {
    title: 'Home'
  });
};
