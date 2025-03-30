class Parser {
    match(url) {
        const matchUrl = url.match(/https:\/\/\S+/)
        const urlMatchedArr = ['www.bilibili.com', 'b23.tv', 'live.bilibili.com']
        return (
            matchUrl &&
            urlMatchedArr.some((matchedStr) => matchUrl[0].includes(matchedStr))
        )
    }

    async fetchWithHeaders(url, headers) {
        const response = await fetch(url, { headers })
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
        return response
    }

    async getRoomIdByShareUrl(url, cookie) {
        const headers = {
            redirect: 'manual',
            authority: 'live.bilibili.com',
            'user-agent': 'Mozilla/5.0',
            ...(cookie && { cookie }),
        }

        const res = await this.fetchWithHeaders(url, headers)
        const redirectUrl = res.headers.get('location')
        if (!redirectUrl) throw new Error('Can\'t get room id')

        const roomIdMatch = redirectUrl.match(/https:\/\/live.bilibili.com\/(\d+)/)
        const roomId = roomIdMatch ? roomIdMatch[1] : null
        if (!roomId) throw new Error('Can\'t get room id')
        return roomId
    }

    async shortUrlGetFull(url, cookie) {
        const headers = {
            redirect: 'manual',
            'user-agent': 'Mozilla/5.0',
            ...(cookie && { Cookie: cookie }), // 如果传递了 cookie，添加到 headers
        }

        try {
            const res = await this.fetchWithHeaders(url, headers)
            if (!res.ok) throw new Error(`Request failed with status: ${res.status}`) // 处理非 2xx 响应
            const redirectUrl = res.headers.get('location') || res?.url
            return redirectUrl
        } catch (error) {
            console.error('Error fetching redirect URL:', error)
            throw error // 重新抛出错误，便于调用者处理
        }
    }

    async getUrlByRoomId(roomId, cookie) {
        const params = new URLSearchParams({
            room_id: roomId,
            no_playurl: '0',
            mask: '1',
            platform: 'web',
            qn: '0',
            protocol: '0,1',
            format: '0,1,2',
            codec: '0,1,2',
        })

        const headers = {
            origin: 'https://live.bilibili.com',
            priority: 'u=1, i',
            'user-agent':
                'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36',
            ...(cookie && { cookie }),
        }

        const url = `https://api.live.bilibili.com/xlive/web-room/v2/index/getRoomPlayInfo?${params}`
        const res = await this.fetchWithHeaders(url, headers)
        return res.json()
    }

    getRealLiveUrlByData(codec) {
        if (!Array.isArray(codec)) return null
        return codec.flatMap((codecItem) =>
            codecItem.url_info.map((i) => `${i.host}${codecItem.base_url}${i.extra}`),
        )[0]
    }

    async getVideoInfo(bvid, cookie) {
        const url = `https://api.bilibili.com/x/web-interface/wbi/view?bvid=${bvid}`
        const headers = {
            origin: 'https://www.bilibili.com',
            'user-agent':
                'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36',
            ...(cookie && { cookie }),
        }
        const res = await this.fetchWithHeaders(url, headers)
        return res.json()
    }

    extractBVid(str) {
        const regExp = /BV[a-zA-Z0-9]+/
        const match = str.match(regExp)
        return match ? match[0] : null
    }

    async getVideoData(bvid, cid, cookie) {
        const params = new URLSearchParams({
            bvid,
            fnval: '4048',
            fnver: '0',
            fourk: '1',
            cid,
        })

        const headers = {
            origin: 'https://api.bilibili.com',
            'user-agent':
                'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36',
            ...(cookie && { cookie }),
        }

        const url = `https://api.bilibili.com/x/player/playurl?${params}`
        const res = await this.fetchWithHeaders(url, headers)
        return res.json()
    }

    async parserVideo(url, options) {
        const bvid = this.extractBVid(url)
        const videoInfo = await this.getVideoInfo(bvid, options.cookie)
        const cid = videoInfo?.data?.pages?.[0]?.cid
        const videoData = await this.getVideoData(bvid, cid, options.cookie)
        // 支持的分辨率
        const accept_quality = videoData?.data?.accept_quality
        const maxHeightQuality = accept_quality?.[0]
        if (!maxHeightQuality) throw new Error('can\'t get video data')
        const videos = videoData?.data?.dash?.video
        // 最大质量可能没有，那么直接获取最高分辨率的视频
        let video = videos.find((video) => video?.id === maxHeightQuality)
        if (!video) video = videos[0]
        const audios = videoData?.data?.dash?.audio
        const audio = audios?.[0]
        // 处理 cookies，只保留 SESSDATA
        const cookie = options?.cookie?.split(';')?.find((cookie) => cookie?.trim().indexOf('SESSDATA') !== -1)?.trim()
        // console.log(bvid, cid, videoData);
        return {
            url: video?.baseUrl,
            audioUrl: audio?.baseUrl,
            headers: [
                [
                    'cookie', cookie ?? '',
                ],
                [
                    'Referer', 'https://www.bilibili.com/',
                ],
                [
                    'User-Agent', 'Mozilla/5.0',
                ],
            ],
        }
    }

    getUrlFromInput(url) {
        const reg = new RegExp(
            'http[s]?://(?:[a-zA-Z]|[0-9]|[$-_@.&+]|[!*(),]|(?:%[0-9a-fA-F][0-9a-fA-F]))+',
        )
        const relUrl = url.match(reg)
        if (!relUrl || !relUrl[0]) {
            throw new Error('输入链接没有解析到地址')
        } else {
            return relUrl[0]
        }
    }

    async parser(input, options) {
        // 从输入内提取 url
        let url = this.getUrlFromInput(input)
        const urlHost = new URL(url)?.host
        if (urlHost === 'b23.tv') {
            // 获取完整 url
            url = await this.shortUrlGetFull(url, options?.cookie)
        }
        // fullUrl 是 live 还是 video
        if (url.indexOf('live.bilibili.com') !== -1) {
            return await this.parserLive(url, options)
        } else {
            return await this.parserVideo(url, options)
        }
    }

    async parserLive(url, options) {
        const roomIdMatch = url.match(/live\.bilibili\.com\/(\d+)/)
        const roomId = roomIdMatch ? roomIdMatch[1] : null

        const data = await this.getUrlByRoomId(roomId, options.cookie)
        if (data.code === 0 && data?.data?.playurl_info?.playurl) {
            const playUrl = data.data.playurl_info.playurl
            const streamItem = playUrl?.stream[1] ?? playUrl?.stream[0]
            return {
                url: this.getRealLiveUrlByData(streamItem?.format[0]?.codec),
            }
        } else {
            throw new Error(`bilibili parser error: ${data.message}`)
        }
    }
}
