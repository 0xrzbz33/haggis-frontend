document.addEventListener("DOMContentLoaded", () => {
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");

    canvas.width = 800;
    canvas.height = 400;
    document.body.appendChild(canvas);

    const leaderboardDiv = document.getElementById("leaderboard");

    // Fonction pour récupérer le leaderboard
    const fetchLeaderboard = () => {
        fetch("https://haggis-backend.onrender.com/api/scores")
            .then(response => response.json())
            .then(data => {
                leaderboardDiv.innerHTML = "<h3>Leaderboard (Top 5)</h3>";
                data.leaderboard.forEach(entry => {
                    const entryDiv = document.createElement("div");
                    entryDiv.textContent = `${entry.name || "Unknown"}: ${entry.score || 0}`;
                    leaderboardDiv.appendChild(entryDiv);
                });
            })
            .catch(error => console.error("Erreur lors du chargement du leaderboard :", error));
    };

    // Fonction pour soumettre un score
    const submitScore = (score) => {
        const username = new URLSearchParams(window.location.search).get("username") || "Unknown";

        fetch("https://haggis-backend.onrender.com/api/scores", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: username, score }),
        })
            .then(response => response.json())
            .then(data => {
                console.log("Score soumis :", data);
                fetchLeaderboard();
            })
            .catch(error => console.error("Erreur lors de la soumission du score :", error));
    };

    // Images du jeu
    const haggisImg = new Image();
    haggisImg.src = "dino.png";

    const backgroundImg = new Image();
    backgroundImg.src = "background.png";

    const groundImg = new Image();
    groundImg.src = "ground.png";

    const obstacleImages = ["barrel.png", "croco.png", "paille.png", "rock.png", "paille1.png"];
    const loadedObstacleImages = obstacleImages.map(src => {
        const img = new Image();
        img.src = src;
        return img;
    });

    const eagleImg = new Image();
    eagleImg.src = "eagle.png";

    // Variables du jeu
    const groundHeight = 350;
    let haggis = {
        x: 100,
        y: groundHeight - 70,
        width: 70,
        height: 60,
        velocityY: 0,
        jumping: false,
        jumpHold: false,
        jumpDuration: 0,
    };

    const gravity = 1.2;
    const jumpStrength = -18;
    const maxJumpHoldDuration = 15;
    let obstacles = [];
    let score = 0;
    let gameSpeed = 12;
    let groundOffset = 0;
    let gameOver = false;
    let obstacleSpawnDelay = 0;

    const obstacleHeights = [30, 50, 70];
    const eagleHeights = [groundHeight - 120, groundHeight - 200];

    const draw = () => {
        context.clearRect(0, 0, canvas.width, canvas.height);

        // Dessiner le fond
        context.drawImage(backgroundImg, 0, 0, canvas.width, canvas.height);

        // Dessiner le sol
        if (!gameOver) {
            groundOffset -= gameSpeed;
            if (groundOffset <= -canvas.width) groundOffset = 0;
        }
        context.drawImage(groundImg, groundOffset, groundHeight, canvas.width, 50);
        context.drawImage(groundImg, groundOffset + canvas.width, groundHeight, canvas.width, 50);

        // Dessiner Haggis
        context.save();
        context.translate(haggis.x + haggis.width / 2, haggis.y + haggis.height / 2);
        context.scale(-1, 1);
        context.drawImage(haggisImg, -haggis.width / 2, -haggis.height / 2, haggis.width, haggis.height);
        context.restore();

        // Dessiner les obstacles
        for (let obs of obstacles) {
            if (obs.type === "eagle") {
                context.save();
                context.translate(obs.x + obs.width / 2, obs.y + obs.height / 2);
                context.scale(-1, 1);
                context.drawImage(eagleImg, -obs.width / 2, -obs.height / 2, obs.width, obs.height);
                context.restore();
            } else {
                const image = loadedObstacleImages[obs.imageIndex];
                const aspectRatio = image.width / image.height;
                const drawHeight = obs.height;
                const drawWidth = drawHeight * aspectRatio;
                context.drawImage(image, obs.x, groundHeight - drawHeight, drawWidth, drawHeight);
            }
        }

        // Afficher le score
        context.font = "24px 'Arial', sans-serif";
        context.fillStyle = "white";
        context.textAlign = "left";
        context.shadowColor = "black";
        context.shadowBlur = 5;
        context.fillText(`Score: ${score}`, 20, 50);
        context.shadowBlur = 0;

        // Afficher "Game Over"
        if (gameOver) {
            context.fillStyle = "rgba(0, 0, 0, 0.7)";
            context.fillRect(0, 0, canvas.width, canvas.height);

            context.font = "48px 'Arial', sans-serif";
            context.fillStyle = "red";
            context.textAlign = "center";
            context.shadowColor = "black";
            context.shadowBlur = 10;
            context.fillText("GAME OVER", canvas.width / 2, canvas.height / 2 - 50);

            context.font = "24px 'Arial', sans-serif";
            context.fillStyle = "white";
            context.fillText("Click to Restart", canvas.width / 2, canvas.height / 2 + 30);
            context.shadowBlur = 0;
        }
    };

    const update = () => {
        if (gameOver) return;

        // Gravité et gestion du saut maintenu
        if (haggis.jumping) {
            if (haggis.jumpHold && haggis.jumpDuration < maxJumpHoldDuration) {
                haggis.velocityY += -0.5;
                haggis.jumpDuration++;
            } else {
                haggis.jumpHold = false;
            }
        }
        haggis.y += haggis.velocityY;
        haggis.velocityY += gravity;

        // Empêcher Haggis de descendre sous le sol
        if (haggis.y > groundHeight - haggis.height) {
            haggis.y = groundHeight - haggis.height;
            haggis.jumping = false;
            haggis.jumpDuration = 0;
        }

        // Déplacer les obstacles
        for (let obs of obstacles) {
            obs.x -= gameSpeed;

            // Vérifier la collision
            const hitboxPadding = 10;
            if (
                haggis.x + hitboxPadding < obs.x + obs.width &&
                haggis.x + haggis.width - hitboxPadding > obs.x &&
                haggis.y + hitboxPadding < obs.y + obs.height &&
                haggis.y + haggis.height - hitboxPadding > obs.y
            ) {
                gameOver = true;
                submitScore(score);
                fetchLeaderboard();
                return;
            }
        }

        // Supprimer les obstacles hors écran
        obstacles = obstacles.filter(obs => obs.x + obs.width > 0);

        // Ajouter des obstacles
        if (obstacleSpawnDelay <= 0) {
            const obstacleCount = Math.floor(Math.random() * 2) + 2;
            const minSpacing = 20;
            const maxSpacing = 40;

            let previousX = canvas.width;
            let lastObstacleType = null;

            for (let i = 0; i < obstacleCount; i++) {
                if (Math.random() < 0.3 && lastObstacleType !== "eagle") {
                    const eagleY = eagleHeights[Math.floor(Math.random() * eagleHeights.length)];
                    obstacles.push({
                        x: previousX,
                        y: eagleY,
                        width: 60,
                        height: 40,
                        type: "eagle",
                    });
                    lastObstacleType = "eagle";
                    previousX += 120;
                } else {
                    const obstacleWidth = 50;
                    const obstacleHeight = obstacleHeights[Math.floor(Math.random() * obstacleHeights.length)];
                    const imageIndex = Math.floor(Math.random() * loadedObstacleImages.length);

                    obstacles.push({
                        x: previousX,
                        y: groundHeight - obstacleHeight,
                        width: obstacleWidth,
                        height: obstacleHeight,
                        imageIndex: imageIndex,
                    });
                    lastObstacleType = "ground";
                    previousX += obstacleWidth + Math.random() * (maxSpacing - minSpacing) + minSpacing;
                }
            }

            obstacleSpawnDelay = 60;
        } else {
            obstacleSpawnDelay--;
        }

        // Augmenter le score
        score++;

        if (score % 100 === 0) {
            gameSpeed += 0.5;
        }
    };

    const resetGame = () => {
        haggis = {
            x: 100,
            y: groundHeight - 70,
            width: 70,
            height: 60,
            velocityY: 0,
            jumping: false,
            jumpHold: false,
            jumpDuration: 0,
        };
        obstacles = [];
        score = 0;
        gameSpeed = 12;
        groundOffset = 0;
        gameOver = false;
        obstacleSpawnDelay = 0;
    };

    const gameLoop = () => {
        draw();
        update();
        requestAnimationFrame(gameLoop);
    };

    document.addEventListener("keydown", (e) => {
        if (e.code === "Space" && !haggis.jumping && !gameOver) {
            haggis.velocityY = jumpStrength;
            haggis.jumping = true;
            haggis.jumpHold = true;
        }
    });

    document.addEventListener("keyup", (e) => {
        if (e.code === "Space") {
            haggis.jumpHold = false;
        }
    });

    canvas.addEventListener("click", () => {
        if (gameOver) {
            resetGame();
        }
    });

    fetchLeaderboard();
    haggisImg.onload = () => gameLoop();
});
