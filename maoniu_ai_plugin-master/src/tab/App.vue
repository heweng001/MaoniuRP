<template>
  <div>
    <div v-if="loading" class="centered">
      <p>Loading...</p>
    </div>
    <div v-else>
      <p class="joke">{{ joke }}</p>

      <div class="">
        <el-button @click="likeJoke" :disabled="likeButtonDisabled" type="success">likeJoke</el-button>
        <el-button @click="logJokes" type="danger">logJokes</el-button>
        <el-button @click="clearStorage" type="primary">clearStorage</el-button>
      </div>
    </div>
  </div>
</template>


<script>
import axios from 'axios';

export default {
  data () {
    return {
      loading: true,
      joke: "",
      likeButtonDisabled: false
    }
  },
  methods: {
    likeJoke(){
      chrome.storage.local.get("jokes", (res) => {
        if(!res.jokes) res.jokes = [];
        res.jokes.push(this.joke)
        chrome.storage.local.set(res);
        this.likeButtonDisabled = true;
      });
    },
    logJokes(){
      chrome.storage.local.get("jokes", (res) => {
        if(res.jokes) res.jokes.map(joke => console.log(joke))
      });
    },
    clearStorage(){
      chrome.storage.local.clear();
    }
  },
  mounted() {
    axios.get(
      "https://icanhazdadjoke.com/",
      { 'headers': { 'Accept': 'application/json' } }
    )
      .then(res => {
        this.joke = res.data.joke
        this.loading = false;
      });
  }
}
</script>

<style>
body {
  height: 98vh;
  text-align: center;
  color: #353638;
  font-size: 22px;
  line-height: 30px;
  font-family: Merriweather,Georgia,serif;
  background: url("https://dab1nmslvvntp.cloudfront.net/wp-content/uploads/2018/12/1544189726troll-dad.png") no-repeat 1% 99%;
  background-size: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.joke {
  max-width: 800px;
}
</style>
