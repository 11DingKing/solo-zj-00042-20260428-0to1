import logging
from django.core.cache import cache as default_cache
from redis.exceptions import RedisError, ConnectionError

logger = logging.getLogger(__name__)


class SafeCache:
    def __init__(self, cache_backend=None):
        self.cache = cache_backend or default_cache

    def get(self, key, default=None):
        try:
            return self.cache.get(key, default)
        except (RedisError, ConnectionError, Exception) as e:
            logger.warning(f'Cache get failed for key {key}: {e}')
            return default

    def set(self, key, value, timeout=None):
        try:
            return self.cache.set(key, value, timeout)
        except (RedisError, ConnectionError, Exception) as e:
            logger.warning(f'Cache set failed for key {key}: {e}')
            return False

    def delete(self, key):
        try:
            return self.cache.delete(key)
        except (RedisError, ConnectionError, Exception) as e:
            logger.warning(f'Cache delete failed for key {key}: {e}')
            return False

    def delete_pattern(self, pattern):
        try:
            if hasattr(self.cache, 'delete_pattern'):
                return self.cache.delete_pattern(pattern)
            return False
        except (RedisError, ConnectionError, Exception) as e:
            logger.warning(f'Cache delete_pattern failed for pattern {pattern}: {e}')
            return False

    def add(self, key, value, timeout=None):
        try:
            return self.cache.add(key, value, timeout)
        except (RedisError, ConnectionError, Exception) as e:
            logger.warning(f'Cache add failed for key {key}: {e}')
            return False

    def get_or_set(self, key, default, timeout=None):
        try:
            return self.cache.get_or_set(key, default, timeout)
        except (RedisError, ConnectionError, Exception) as e:
            logger.warning(f'Cache get_or_set failed for key {key}: {e}')
            if callable(default):
                return default()
            return default


safe_cache = SafeCache()
