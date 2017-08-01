# ActiveRez

An interactive resume making app.

*NOTE!* This is still VERY much under construction!

## Installation.

1. Make sure you have NodeJS installed (use the LTS version). 
2. Download this repo (`git clone` or download the .zip and extract if you don't have a github (shame on you)).
3. Navigate into the project folder, open a terminal, and run: `npm install` to install dependencies.
4. Setup Mongodb (see below).
5. Seed the tags if needed (see below2: Below Harder).
6. Run `gulp build && npm start` to start em!

## Setting up MongoDB

You'll need MongoDB to run this. 
1. First, go [here] to download it. 
2. The gulpfile (`gulpfile.js`) will automatically attempt to start a mongodb instance with default parameters. If you've never used mongodb before, that's fine: most of the stuff should be self-explanatory.
3. Go to that `gulpfile.js`, and find the line that says `kid.exec(...)`. This basically executes a bash command. The first part says "cd into the mongo installations `bin` folder". The second part says `start mongod (the database instance) with the FOLLOWING database 'storage' path. 
4. This bit's important. The folder named as the `-dbpath` folder MUST exist. 
5. Also, make sure that `&& pause` bit is there. Otherwise it'll start, see everything's okay, and then immediatedly shut off. Boo.

## Seeding the DB
To make things a little easier, I've written a script (`tagReset.txt`) to seed the DB. To use it:
1. Copy the contents of the file. Yes, the text.
2. Open a terminal in the mongodb `bin` folder.
3. Type `mongo`
4. Type `use activerez`.
5. Paste the contents of that text file. Script should run.
