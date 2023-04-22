const axios = require("axios");
const express = require("express");
const app = express();


const translateFields = {
  // "k1": "Average Kills",
  // "k2": "Average Deaths",
  // "k10": "Average Triple Kills",
  "m1": "Matches",
  "k6": "Win Rate",
  "k5": "Average K/D",
}

const maps = [
  "de_dust2",
  "de_inferno",
  "de_mirage",
  "de_nuke",
  "de_overpass",
  "de_train",
  "de_vertigo",
  "de_cache",
  "de_cbble",
  "de_anubis",
  "de_ancient",
]

const getPlayerdata = async (playerId) => {
  let data = {};
  await axios.get(`https://api.faceit.com/stats/v1/stats/users/${playerId}/games/csgo`)
    .then(function (response) {
      data = response.data;
    }
    ).catch(function (error) {
      throw error;
    }
    ).finally(function () {
      console.log("done");
    });
  const correctSegment = data.segments.filter(segment => segment._id.segmentId === "csgo_map")[0].segments;
  const dataWeWant = {}

  maps.forEach(map => {
    dataWeWant[map] = {};
    Object.keys(translateFields).forEach(key => {
      if (correctSegment[map]) {
        dataWeWant[map][translateFields[key]] = correctSegment[map][key];
      }
    });
  });
  return dataWeWant;
};

const getMatchroomPlayers = async (matchId) => {
  if (!matchId) throw new Error("No matchId provided");
  let data = {};
  await axios.get(`https://api.faceit.com/match/v2/match/${matchId}`)
    .then(function (response) {
      data = response.data;
    }
    ).catch(function (error) {
      throw error;
    }
    ).finally(function () {
      console.log("done");
    });
  return [data.payload.teams.faction1.roster.map(player => ({ id: player.id, name: player.nickname })), data.payload.teams.faction2.roster.map(player => ({ id: player.id, name: player.nickname }))];
}
app.get("/matchroom", async (req, res) => {
  try {
    const dataWeWant = {};
    console.log(req.query);
    const teams = await getMatchroomPlayers(req.query.matchId);
    const promises = [];
    for (let team of teams) {
      for (let player of team) {
        promises.push(getPlayerdata(player.id));
      }
    }
    const playerData = await Promise.all(promises);
    for (let i = 0; i < playerData.length; i++) {
      const team = teams[Math.floor(i / 5)];
      const player = team[i % 5];
      dataWeWant[player.name] = playerData[i];
    }
    // create a html table that shows the data
    let html = "<table>";
    html += "<tr>";
    html += `<th></th>`;

    Object.keys(dataWeWant).forEach(player => {
      html += `<th>${player}</th>`;
    });
    html += "</tr>";
    for (let map in maps) {
      html += "<tr>";
      html += `<th>${maps[map]}</th>`;
      for (let player in dataWeWant) {
        const playerData = dataWeWant[player][maps[map]];
        const preparePlayerData = Object.keys(playerData).map(key => playerData[key]).join("<hr>");
        html += `<td>${preparePlayerData}</td>`;
      }
      html += `<td>${Object.values(translateFields).join("<hr>")}</td>`;
      html += "</tr>";
    }
    html += `<style>
  td, th{ border: 1px solid black; padding: 5px; }
  td{padding:10px 0}
  tr:nth-child(even) {background-color: #333; color: white}
  th{
    min-width: 100px;
  }
  </style>`;
    res.send(
      html
    );
  } catch (error) {
    res.send(error);
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
