_ = require 'lodash'
async = require 'async'

mapLimit = 10

###
	Parent component class.

	Never initialize directly this class, always one of its children.
###
class ApiComponentIn
	constructor: (heraRemote, profileIds) ->
		@heraRemote = heraRemote
		@profileIds = profileIds

	# Global All networks serialize function
	_serialize: (params) ->
		params.apiVersion = ApiComponentIn.apiVersion
		params.globalFallback = ApiComponentIn.globalFallback
		params

	_execute: (heraRemote, method, heraEndpoint, paramsArr, outputProcessFunc, next) =>
		async.mapLimit paramsArr, mapLimit, (params, next) =>
			params = @_serialize params
			heraRemote[method] heraEndpoint, params, (err, res) ->
				return next err if err
				next null, outputProcessFunc res
		, next



ApiComponentIn.apiVersion = 'v2.12'
ApiComponentIn.globalFallback = yes



class FbApiComponentIn extends ApiComponentIn
	constructor: (heraRemote, profileIds) ->
		super heraRemote, profileIds
		@heraRemote = heraRemote
		@profileIds = profileIds

	_load: (heraRemote, params, outputProcessFunc, next) =>
		@_execute heraRemote, 'post', 'facebookProxy', params, outputProcessFunc, next

	# Global FB serialize
	_serialize: (params) ->
		super params
		params.hostname = FbApiComponentIn.hostname
		params

	_serializeGetFeed: (fields, limit) ->
		# Default fields
		fields = 'created_time,message,type,picture,permalink_url,from' unless fields
		# Default limit
		limit = 3 unless limit

		_.map @profileIds, (profileId) ->
			method: 'GET'
			path: "/#{profileId}/feed"
			profileId: "page_#{profileId}"
			params:
				fields: fields
				limit: limit


	_outputGetFeed: (apiData) ->
		return [] unless apiData.response.data

		_.transform apiData.response.data, (result, item) ->
			profileId = item.id.split('_')[0]
			if item.from?.id?
				authorProfilePictures = _.transform ['normal', 'small', 'album', 'large', 'square'], (accumulator, type) ->
					accumulator[type] = "https://graph.facebook.com/#{item.from.id}/picture?type=#{type}"
				, {}

			result[profileId] ?= []
			result[profileId].push
				id: item.id
				name: item.name if item.name?
				type: item.type if item.type?
				message: item.message or ''
				createdTime: item.created_time if item.created_time?
				picture: item.picture if item.picture?
				fullPicture: item.full_picture if item.full_picture?
				permalinkUrl: item.permalink_url if item.permalink_url?
				authorId: item.from?.id or null
				authorName: item.from?.name or ''
				authorProfilePictures: if item.from?.id? then authorProfilePictures else null
		, {}


	getFeed: (fields, limit, next) ->
		params = @_serializeGetFeed fields, limit
		@_load @heraRemote, params, @_outputGetFeed, (err, res) ->
			return next err if err
			out = {}
			_.forEach res, (item) ->
				_.forEach item, (val, key) ->
					out[key] ?= {}
					out[key].posts = val
			next null, out

FbApiComponentIn.hostname = 'graph.facebook.com'


class GpApiComponentIn extends ApiComponentIn
	constructor: (heraRemote, profileIds = []) ->
		super heraRemote, profileIds
		@heraRemote = heraRemote
		@profileIds = profileIds


	_load: (heraRemote, params, outputProcessFunc, next) =>
		@_execute heraRemote, 'post', 'googleProxy', params, outputProcessFunc, next


	_serialize: (params) ->
		params


	_outputYoutubeAnalytics: (apiData) =>
		return {} unless apiData.columnHeaders?.length or apiData.rows?.length

		out = {}
		headers = apiData.columnHeaders

		_mapMetricsNames = (outputItem, metricData) ->
			_.each metricData, (metricValue, metricIndex) ->
				outputItem[headers[metricIndex]?.name] = metricValue

		# Map output to structure keyed by profileId -> aggregation metric (video/elapsedVideoTimeRatio if available) -> metric name.
		_.each @profileIds, (profileId) ->
			out[profileId] ?= {}

			if isMultivalueMetric = _.find(headers, (header) -> header.name in ['elapsedVideoTimeRatio', 'gender'])
				out[profileId] = _.map apiData.rows, (partMetricData) ->
					outputItem = {}
					_.each partMetricData, (metricValue, metricIndex) ->
						outputItem[headers[metricIndex]?.name] = metricValue
					outputItem

			else
				# dimensionMetricIndex = _.findIndex headers, (header) -> header.name in ['video']
				dimensionMetricSortedIndex = _.findIndex headers, (header) -> header.name in ['video', 'insightTrafficSourceType']

				_.each apiData.rows, (metricData) ->
					if dimensionMetricSortedIndex >= 0
						out[profileId] = [] if _.isEmpty out[profileId]
						newItem = {}
						out[profileId].push newItem
						_mapMetricsNames newItem, metricData

					else
						_mapMetricsNames out[profileId], metricData


		out


	getYoutubeAnalytics: (ids, from, to, metrics, {dimensions, maxResults, filters, sort}, next) ->
		params = _.map @profileIds, (profileId) ->
			mapped =
				method: 'GET'
				path: '/youtube/analytics/v1/reports'
				profileId: profileId
				params:
					ids: ids
					'start-date': from
					'end-date': to
					metrics: metrics
			mapped.params.dimensions = dimensions if dimensions
			mapped.params['max-results'] = maxResults if maxResults
			mapped.params.filters = filters if filters
			mapped.params.sort = sort if sort
			mapped

		@_load @heraRemote, params, @_outputYoutubeAnalytics, next


	_outputYoutubeVideos: (apiData) ->
		return {} unless apiData.items?.length
		apiData

	# Limitation: Api limit to params.id is <= 50
	getYoutubeVideos: (ids, parts, next) ->
		params = _.map @profileIds, (profileId) ->
			method: 'GET'
			path: '/youtube/v3/videos'
			profileId: profileId
			params:
				id: ids.join ','
				part: parts.join ','

		@_load @heraRemote, params, @_outputYoutubeVideos, next



module.exports = {
	FbApiComponentIn
	GpApiComponentIn
}
