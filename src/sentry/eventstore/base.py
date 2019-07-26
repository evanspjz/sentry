from __future__ import absolute_import

from sentry import nodestore
from sentry.utils.services import Service


class EventStorage(Service):
    __all__ = (
        'minimal_columns',
        'full_columns',
        'get_event_by_id',
        'get_events',
        'get_prev_event_id',
        'get_next_event_id',
        'bind_nodes',
    )

    # The minimal list of columns we need to get from snuba to bootstrap an
    # event. If the client is planning on loading the entire event body from
    # nodestore anyway, we may as well only fetch the minimum from snuba to
    # avoid duplicated work.
    minimal_columns = [
        'event_id',
        'group_id',
        'project_id',
        'timestamp',
    ]

    # A list of all useful columns we can get from snuba.
    full_columns = minimal_columns + [
        'culprit',
        'location',
        'message',
        'platform',
        'title',
        'type',

        # Required to provide snuba-only tags
        'tags.key',
        'tags.value',

        # Required to provide snuba-only 'user' interface
        'email',
        'ip_address',
        'user_id',
        'username',
    ]

    def get_event_by_id(self, project_id, event_id, cols):
        raise NotImplementedError

    def get_events(self, start, end, cols, conditions, filter_keys, orderby, limit, offset):
        raise NotImplementedError

    def get_next_event_id(self, event, conditions, filter_keys):
        raise NotImplementedError

    def get_prev_event_id(self, event, conditions, filter_keys):
        raise NotImplementedError

    def bind_nodes(self, object_list, *node_names):
        """
        For a list of Event objects, and a property name where we might find an
        (unfetched) NodeData on those objects, fetch all the data blobs for
        those NodeDatas with a single multi-get command to nodestore, and bind
        the returned blobs to the NodeDatas
        """
        object_node_list = []
        for name in node_names:
            object_node_list.extend(
                ((i, getattr(i, name)) for i in object_list if getattr(i, name).id)
            )

        node_ids = [n.id for _, n in object_node_list]
        if not node_ids:
            return

        node_results = nodestore.get_multi(node_ids)

        for item, node in object_node_list:
            data = node_results.get(node.id) or {}
            node.bind_data(data, ref=node.get_ref(item))