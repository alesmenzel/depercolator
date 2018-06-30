/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
const _ = require('lodash');
const async = require('async');

const mapLimit = 10;

/*
	Parent component class.

	Never initialize directly this class, always one of its children.
*/
class ApiComponentIn {
  constructor(heraRemote, profileIds) {
    this._execute = this._execute.bind(this);
    this.heraRemote = heraRemote;
    this.profileIds = profileIds;
  }

  // Global All networks serialize function
  _serialize(params) {
    params.apiVersion = ApiComponentIn.apiVersion;
    params.globalFallback = ApiComponentIn.globalFallback;
    return params;
  }

  _execute(heraRemote, method, heraEndpoint, paramsArr, outputProcessFunc, next) {
    return async.mapLimit(
      paramsArr,
      mapLimit,
      (params, next) => {
        params = this._serialize(params);
        return heraRemote[method](heraEndpoint, params, function(err, res) {
          if (err) {
            return next(err);
          }
          return next(null, outputProcessFunc(res));
        });
      },
      next
    );
  }
}

ApiComponentIn.apiVersion = 'v2.12';
ApiComponentIn.globalFallback = true;

class FbApiComponentIn extends ApiComponentIn {
  constructor(heraRemote, profileIds) {
    this._load = this._load.bind(this);
    super(heraRemote, profileIds);
    this.heraRemote = heraRemote;
    this.profileIds = profileIds;
  }

  _load(heraRemote, params, outputProcessFunc, next) {
    return this._execute(heraRemote, 'post', 'facebookProxy', params, outputProcessFunc, next);
  }

  // Global FB serialize
  _serialize(params) {
    super._serialize(params);
    params.hostname = FbApiComponentIn.hostname;
    return params;
  }

  _serializeGetFeed(fields, limit) {
    // Default fields
    if (!fields) {
      fields = 'created_time,message,type,picture,permalink_url,from';
    }
    // Default limit
    if (!limit) {
      limit = 3;
    }

    return _.map(this.profileIds, profileId => ({
      method: 'GET',
      path: `/${profileId}/feed`,
      profileId: `page_${profileId}`,
      params: {
        fields,
        limit,
      },
    }));
  }

  _outputGetFeed(apiData) {
    if (!apiData.response.data) {
      return [];
    }

    return _.transform(
      apiData.response.data,
      function(result, item) {
        let authorProfilePictures;
        const profileId = item.id.split('_')[0];
        if (item.from?.id != null) {
          authorProfilePictures = _.transform(
            ['normal', 'small', 'album', 'large', 'square'],
            (accumulator, type) =>
              (accumulator[type] = `https://graph.facebook.com/${item.from.id}/picture?type=${type}`),
            {}
          );
        }

        if (result[profileId] == null) {
          result[profileId] = [];
        }
        return result[profileId].push({
          id: item.id,
          name: item.name != null ? item.name : undefined,
          type: item.type != null ? item.type : undefined,
          message: item.message || '',
          createdTime: item.created_time != null ? item.created_time : undefined,
          picture: item.picture != null ? item.picture : undefined,
          fullPicture: item.full_picture != null ? item.full_picture : undefined,
          permalinkUrl: item.permalink_url != null ? item.permalink_url : undefined,
          authorId: item.from?.id || null,
          authorName: item.from?.name || '',
          authorProfilePictures: item.from?.id != null ? authorProfilePictures : null,
        });
      },
      {}
    );
  }

  getFeed(fields, limit, next) {
    const params = this._serializeGetFeed(fields, limit);
    return this._load(this.heraRemote, params, this._outputGetFeed, function(err, res) {
      if (err) {
        return next(err);
      }
      const out = {};
      _.forEach(res, item =>
        _.forEach(item, function(val, key) {
          if (out[key] == null) {
            out[key] = {};
          }
          return (out[key].posts = val);
        })
      );
      return next(null, out);
    });
  }
}

FbApiComponentIn.hostname = 'graph.facebook.com';

class GpApiComponentIn extends ApiComponentIn {
  constructor(heraRemote, profileIds = []) {
    this._load = this._load.bind(this);
    this._outputYoutubeAnalytics = this._outputYoutubeAnalytics.bind(this);
    super(heraRemote, profileIds);
    this.heraRemote = heraRemote;
    this.profileIds = profileIds;
  }

  _load(heraRemote, params, outputProcessFunc, next) {
    return this._execute(heraRemote, 'post', 'googleProxy', params, outputProcessFunc, next);
  }

  _serialize(params) {
    return params;
  }

  _outputYoutubeAnalytics(apiData) {
    if (!apiData.columnHeaders?.length && !apiData.rows?.length) {
      return {};
    }

    const out = {};
    const headers = apiData.columnHeaders;

    const _mapMetricsNames = (outputItem, metricData) =>
      _.each(metricData, (metricValue, metricIndex) => (outputItem[(headers[metricIndex]?.name)] = metricValue));

    // Map output to structure keyed by profileId -> aggregation metric (video/elapsedVideoTimeRatio if available) -> metric name.
    _.each(this.profileIds, function(profileId) {
      let isMultivalueMetric;
      if (out[profileId] == null) {
        out[profileId] = {};
      }

      if ((isMultivalueMetric = _.find(headers, header => ['elapsedVideoTimeRatio', 'gender'].includes(header.name)))) {
        return (out[profileId] = _.map(apiData.rows, function(partMetricData) {
          const outputItem = {};
          _.each(
            partMetricData,
            (metricValue, metricIndex) => (outputItem[(headers[metricIndex]?.name)] = metricValue)
          );
          return outputItem;
        }));
      } else {
        // dimensionMetricIndex = _.findIndex headers, (header) -> header.name in ['video']
        const dimensionMetricSortedIndex = _.findIndex(headers, header =>
          ['video', 'insightTrafficSourceType'].includes(header.name)
        );

        return _.each(apiData.rows, function(metricData) {
          if (dimensionMetricSortedIndex >= 0) {
            if (_.isEmpty(out[profileId])) {
              out[profileId] = [];
            }
            const newItem = {};
            out[profileId].push(newItem);
            return _mapMetricsNames(newItem, metricData);
          } else {
            return _mapMetricsNames(out[profileId], metricData);
          }
        });
      }
    });

    return out;
  }

  getYoutubeAnalytics(ids, from, to, metrics, { dimensions, maxResults, filters, sort }, next) {
    const params = _.map(this.profileIds, function(profileId) {
      const mapped = {
        method: 'GET',
        path: '/youtube/analytics/v1/reports',
        profileId,
        params: {
          ids,
          'start-date': from,
          'end-date': to,
          metrics,
        },
      };
      if (dimensions) {
        mapped.params.dimensions = dimensions;
      }
      if (maxResults) {
        mapped.params['max-results'] = maxResults;
      }
      if (filters) {
        mapped.params.filters = filters;
      }
      if (sort) {
        mapped.params.sort = sort;
      }
      return mapped;
    });

    return this._load(this.heraRemote, params, this._outputYoutubeAnalytics, next);
  }

  _outputYoutubeVideos(apiData) {
    if (!apiData.items?.length) {
      return {};
    }
    return apiData;
  }

  // Limitation: Api limit to params.id is <= 50
  getYoutubeVideos(ids, parts, next) {
    const params = _.map(this.profileIds, profileId => ({
      method: 'GET',
      path: '/youtube/v3/videos',
      profileId,
      params: {
        id: ids.join(','),
        part: parts.join(','),
      },
    }));

    return this._load(this.heraRemote, params, this._outputYoutubeVideos, next);
  }
}

module.exports = {
  FbApiComponentIn,
  GpApiComponentIn,
};
