import axios from 'axios'

const http = (userData) => axios.create({
    baseURL: "https://domain.com/api/v1/",
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': 'Bearer ' + userData.access_token
    },
    transformResponse: [function (response, data) {
        try {
            var json = JSON.parse(data);
            return json
        }
        catch(err) {
            return data
        }
    }],
})

export default http