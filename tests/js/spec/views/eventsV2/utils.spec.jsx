import {mount} from 'enzyme';

import {initializeOrg} from 'app-test/helpers/initializeOrg';
import {
  getFieldRenderer,
  getAggregateAlias,
  getEventTagSearchUrl,
} from 'app/views/eventsV2/utils';

describe('eventTagSearchUrl()', function() {
  let location;
  beforeEach(function() {
    location = {
      pathname: '/organization/org-slug/events/',
      query: {},
    };
  });

  it('adds a query', function() {
    expect(getEventTagSearchUrl('browser', 'firefox', location)).toEqual({
      pathname: location.pathname,
      query: {query: 'browser:"firefox"'},
    });
  });

  it('removes eventSlug', function() {
    location.query.eventSlug = 'project-slug:deadbeef';
    expect(getEventTagSearchUrl('browser', 'firefox', location)).toEqual({
      pathname: location.pathname,
      query: {query: 'browser:"firefox"'},
    });
  });

  it('appends to an existing query', function() {
    location.query.query = 'failure';
    expect(getEventTagSearchUrl('browser', 'firefox', location)).toEqual({
      pathname: location.pathname,
      query: {query: 'failure browser:"firefox"'},
    });
  });
});

describe('getAggregateAlias', function() {
  it('no-ops simple fields', function() {
    expect(getAggregateAlias('field')).toEqual('field');
    expect(getAggregateAlias('under_field')).toEqual('under_field');
  });

  it('handles 0 arg functions', function() {
    expect(getAggregateAlias('count()')).toEqual('count');
    expect(getAggregateAlias('count_unique()')).toEqual('count_unique');
  });

  it('handles 1 arg functions', function() {
    expect(getAggregateAlias('count(id)')).toEqual('count_id');
    expect(getAggregateAlias('count_unique(user)')).toEqual('count_unique_user');
    expect(getAggregateAlias('count_unique(issue.id)')).toEqual('count_unique_issue_id');
  });
});

describe('getFieldRenderer', function() {
  let location, context, project, organization, data;
  beforeEach(function() {
    context = initializeOrg({
      project: TestStubs.Project(),
    });
    organization = context.organization;
    project = context.project;

    location = {
      pathname: '/events',
      query: {},
    };
    data = {
      title: 'ValueError: something bad',
      transaction: 'api.do_things',
      boolValue: 1,
      numeric: 1.23,
      createdAt: new Date(2019, 9, 3, 12, 13, 14),
      url: '/example',
      latest_event: 'deadbeef',
      'project.name': project.slug,
    };
  });

  it('can render string fields', function() {
    const renderer = getFieldRenderer('url', {url: 'string'});
    expect(renderer).toBeInstanceOf(Function);
    const wrapper = mount(renderer(data, {location, organization}));
    const link = wrapper.find('QueryLink');
    expect(link).toHaveLength(1);
    expect(link.props().to).toEqual({
      pathname: location.pathname,
      query: {query: 'url:/example'},
    });
    expect(link.text()).toEqual(data.url);
  });

  it('can render boolean fields', function() {
    const renderer = getFieldRenderer('boolValue', {boolValue: 'boolean'});
    expect(renderer).toBeInstanceOf(Function);
    const wrapper = mount(renderer(data, {location, organization}));
    const link = wrapper.find('QueryLink');
    expect(link).toHaveLength(1);
    expect(link.props().to).toEqual({
      pathname: location.pathname,
      query: {query: 'boolValue:1'},
    });
  });

  it('can render integer fields', function() {
    const renderer = getFieldRenderer('numeric', {numeric: 'integer'});
    expect(renderer).toBeInstanceOf(Function);
    const wrapper = mount(renderer(data, {location, organization}));

    const value = wrapper.find('Count');
    expect(value).toHaveLength(1);
    expect(value.props().value).toEqual(data.numeric);
  });

  it('can render date fields', function() {
    const renderer = getFieldRenderer('createdAt', {createdAt: 'date'});
    expect(renderer).toBeInstanceOf(Function);
    const wrapper = mount(renderer(data, {location, organization}));

    const value = wrapper.find('StyledDateTime');
    expect(value).toHaveLength(1);
    expect(value.props().date).toEqual(data.createdAt);
  });

  it('can render null date fields', function() {
    const renderer = getFieldRenderer('nope', {nope: 'date'});
    expect(renderer).toBeInstanceOf(Function);
    const wrapper = mount(renderer(data, {location, organization}));

    const value = wrapper.find('StyledDateTime');
    expect(value).toHaveLength(0);
    expect(wrapper.text()).toEqual('n/a');
  });

  it('can render transaction as a link', function() {
    const renderer = getFieldRenderer('transaction', {transaction: 'string'});
    expect(renderer).toBeInstanceOf(Function);
    const wrapper = mount(renderer(data, {location, organization}));

    const value = wrapper.find('OverflowLink');
    expect(value).toHaveLength(1);
    expect(value.props().to).toEqual({
      pathname: location.pathname,
      query: {
        eventSlug: `${project.slug}:deadbeef`,
      },
    });
    expect(value.text()).toEqual(data.transaction);
  });

  it('can render title as a link', function() {
    const renderer = getFieldRenderer('title', {title: 'string'});
    expect(renderer).toBeInstanceOf(Function);
    const wrapper = mount(renderer(data, {location, organization}));

    const value = wrapper.find('OverflowLink');
    expect(value).toHaveLength(1);
    expect(value.props().to).toEqual({
      pathname: location.pathname,
      query: {
        eventSlug: `${project.slug}:deadbeef`,
      },
    });
    expect(value.text()).toEqual(data.title);
  });

  it('can render project as an avatar', function() {
    const renderer = getFieldRenderer('project', {'project.name': 'string'});
    expect(renderer).toBeInstanceOf(Function);
    const wrapper = mount(
      renderer(data, {location, organization}),
      context.routerContext
    );

    const value = wrapper.find('ProjectBadge');
    expect(value).toHaveLength(1);
    expect(value.props().project).toEqual(project);
  });

  it('can coerce string field to a link', function() {
    const renderer = getFieldRenderer('url', {url: 'string'}, true);
    expect(renderer).toBeInstanceOf(Function);
    const wrapper = mount(
      renderer(data, {location, organization}),
      context.routerContext
    );

    // No basic link should be present.
    expect(wrapper.find('QueryLink')).toHaveLength(0);

    const link = wrapper.find('OverflowLink');
    expect(link.props().to).toEqual({
      pathname: location.pathname,
      query: {
        eventSlug: `${project.slug}:deadbeef`,
      },
    });
    expect(link.text()).toEqual('/example');
  });

  it('can coerce number field to a link', function() {
    const renderer = getFieldRenderer('numeric', {numeric: 'number'}, true);
    expect(renderer).toBeInstanceOf(Function);
    const wrapper = mount(
      renderer(data, {location, organization}),
      context.routerContext
    );

    const link = wrapper.find('OverflowLink');
    expect(link.props().to).toEqual({
      pathname: location.pathname,
      query: {
        eventSlug: `${project.slug}:deadbeef`,
      },
    });
    expect(link.find('Count').props().value).toEqual(data.numeric);
  });

  it('can coerce date field to a link', function() {
    const renderer = getFieldRenderer('createdAt', {createdAt: 'date'}, true);
    expect(renderer).toBeInstanceOf(Function);
    const wrapper = mount(
      renderer(data, {location, organization}),
      context.routerContext
    );

    const link = wrapper.find('OverflowLink');
    expect(link.props().to).toEqual({
      pathname: location.pathname,
      query: {
        eventSlug: `${project.slug}:deadbeef`,
      },
    });
    expect(link.find('StyledDateTime').props().date).toEqual(data.createdAt);
  });
});
