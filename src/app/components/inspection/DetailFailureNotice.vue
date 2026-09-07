<script setup lang="ts">
// What a detail route reports when its own request did not complete: the real
// message rather than a phrase standing in for it, and the retry beside it,
// which is the way back without re-finding the link.
//
// This route reports it, because this route made the request — the shell
// reports what happened to the session, so neither hides or repeats the other.
//
// The retry is the caller's, because what "open again" means belongs to the
// route: most reopen through the shared request (`detail-request.ts`
// § DetailRequest.retryOpen), while a route holding its own request effect
// moves focus to the heading first, the button being inside the branch the
// retry replaces.
import SubjectUnavailable from './SubjectUnavailable.vue';

defineProps<{
  /**
   * What failed, in the words the route words it with. Null only while
   * nothing has failed, which a caller never draws: each one renders this
   * inside its own failure branch.
   */
  message: string | null;
}>();

defineEmits<{
  /** The reader asked for the subject to be opened again. */
  retry: [];
}>();
</script>

<template>
  <SubjectUnavailable outcome="error">
    {{ message }}
    <template #exit>
      <button type="button" @click="$emit('retry')">Try again</button>
    </template>
  </SubjectUnavailable>
</template>
