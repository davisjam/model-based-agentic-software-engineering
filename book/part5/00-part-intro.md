<!-- part-foreshadows: modeling-thesis, seat-moves -->
This book built its abstractions first; this Part watches one system implement them, end to
end. It follows the design and construction of DocAble, one software implementation of the
method—a production document-accessibility platform built almost entirely by
directing a fleet of coding agents rather than writing the implementation by hand. The setting
happens to be document accessibility—a legal deadline, demanding quality requirements, and a
problem whose manual solution does not scale—but the engineering questions are much broader.
How do you govern a fleet moving faster than you can read? How do recurring failures become
permanent infrastructure? How do models, mechanisms, and judgment accumulate into an
engineering environment that stays trustworthy as the system grows?

Rather than presenting isolated examples, these chapters follow one system from conception
through deployment. You will see the architectural decisions, the failures that forced new
mechanisms into existence, the growth of the governed environment around the product, and the
gradual shift from directly supervising implementation to governing the conditions under which
implementation occurs. By the end of this Part, you should no longer have to imagine MAGE. You
will have watched the method build one real production system from beginning to end—one worked
instance of the abstractions the earlier Parts drew from many cases.
